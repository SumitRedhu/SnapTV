package com.caststream.tv

import android.annotation.SuppressLint
import android.app.UiModeManager
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Bitmap
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var errorLayout: View
    private lateinit var tvErrorTitle: TextView
    private lateinit var tvErrorDetails: TextView
    private lateinit var etServerUrl: EditText
    private lateinit var btnConnect: Button
    private lateinit var btnRetry: Button
    private lateinit var btnLocalUi: Button
    private lateinit var loadingIndicator: ProgressBar

    private lateinit var prefs: SharedPreferences

    companion object {
        private const val PREFS_NAME = "snaptv_settings"
        private const val KEY_SERVER_URL = "saved_server_url"
        // Default bundled offline asset path
        private const val LOCAL_ASSET_URL = "file:///android_asset/web/index.html"
    }

    private var currentTargetUrl: String = ""
    private var isTvDevice: Boolean = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep TV screen awake during video streaming
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Detect if running on Android TV / Google TV or Phone / Tablet
        val uiModeManager = getSystemService(UI_MODE_SERVICE) as? UiModeManager
        isTvDevice = uiModeManager?.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION ||
                packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)

        if (isTvDevice) {
            // Android TV: Enforce 16:9 widescreen landscape and hide system bars
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        } else {
            // Phones & Tablets: Allow natural orientation changes (portrait & landscape)
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_USER
        }

        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Bind layout views
        webView = findViewById(R.id.webView)
        errorLayout = findViewById(R.id.errorLayout)
        tvErrorTitle = findViewById(R.id.tvErrorTitle)
        tvErrorDetails = findViewById(R.id.tvErrorDetails)
        etServerUrl = findViewById(R.id.etServerUrl)
        btnConnect = findViewById(R.id.btnConnect)
        btnRetry = findViewById(R.id.btnRetry)
        btnLocalUi = findViewById(R.id.btnLocalUi)
        loadingIndicator = findViewById(R.id.loadingIndicator)

        configureWebView()
        setupErrorOverlayListeners()

        // Always default to local bundled native UI so the app runs out-of-the-box with zero configuration
        val savedUrl = prefs.getString(KEY_SERVER_URL, null)
        currentTargetUrl = if (!savedUrl.isNullOrBlank() && !savedUrl.contains("ais-pre-") && !savedUrl.contains("ais-dev-")) {
            savedUrl
        } else {
            LOCAL_ASSET_URL
        }
        loadServerUrl(currentTargetUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings: WebSettings = webView.settings

        // HTML5, DOM Storage, and Modern JS features
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // Enable local asset file loading
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true

        // Allow instant video playback without requiring a mouse click
        settings.mediaPlaybackRequiresUserGesture = false

        // Disallow ad popups from opening rogue new windows
        settings.javaScriptCanOpenWindowsAutomatically = false
        settings.setSupportMultipleWindows(false)

        // Hardware acceleration for smooth 60fps streaming
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // Dynamic User-Agent
        val defaultUserAgent = settings.userAgentString
        val deviceTag = if (isTvDevice) "SnapTV/1.0 (Android TV; Leanback)" else "SnapTV/1.0 (Android Mobile)"
        settings.userAgentString = "$defaultUserAgent $deviceTag"

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                loadingIndicator.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                loadingIndicator.visibility = View.GONE
            }

            // Native Serverless Proxy & Stream Interceptor (Bypasses CORS natively on Android)
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return super.shouldInterceptRequest(view, request)
                val path = url.path ?: ""

                // Intercept stream proxy requests (/api/proxy or /api/proxy/hls)
                if (path.contains("/api/proxy")) {
                    val targetUrl = url.getQueryParameter("url")
                    if (!targetUrl.isNullOrEmpty()) {
                        try {
                            val connection = (java.net.URL(targetUrl).openConnection() as java.net.HttpURLConnection).apply {
                                requestMethod = "GET"
                                connectTimeout = 10000
                                readTimeout = 15000
                                setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                                setRequestProperty("Referer", targetUrl)
                                instanceFollowRedirects = true
                            }
                            val rawContentType = connection.contentType ?: if (targetUrl.contains(".m3u8")) "application/vnd.apple.mpegurl" else "video/MP2T"
                            val mimeType = rawContentType.split(";")[0].trim()
                            val responseHeaders = mutableMapOf<String, String>().apply {
                                put("Access-Control-Allow-Origin", "*")
                                put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
                                put("Access-Control-Allow-Headers", "*")
                            }
                            return WebResourceResponse(
                                mimeType,
                                "UTF-8",
                                connection.responseCode,
                                connection.responseMessage ?: "OK",
                                responseHeaders,
                                connection.inputStream
                            )
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }

                // Intercept direct web scraper requests
                if (path.contains("/api/scrape-native")) {
                    val targetUrl = url.getQueryParameter("url")
                    if (!targetUrl.isNullOrEmpty()) {
                        try {
                            val connection = (java.net.URL(targetUrl).openConnection() as java.net.HttpURLConnection).apply {
                                requestMethod = "GET"
                                connectTimeout = 12000
                                readTimeout = 15000
                                setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                                instanceFollowRedirects = true
                            }
                            val responseHeaders = mutableMapOf<String, String>().apply {
                                put("Access-Control-Allow-Origin", "*")
                            }
                            return WebResourceResponse(
                                "text/html",
                                "UTF-8",
                                connection.responseCode,
                                "OK",
                                responseHeaders,
                                connection.inputStream
                            )
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }

                return super.shouldInterceptRequest(view, request)
            }

            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                val lower = url.lowercase()
                val isAdOrRedirect = lower.contains("doubleclick") ||
                        lower.contains("popcash") ||
                        lower.contains("adsterra") ||
                        lower.contains("onclick") ||
                        lower.contains("betting") ||
                        lower.contains("track")
                if (!isAdOrRedirect) {
                    view.loadUrl(url)
                }
                return true
            }

            // Catch HTTP status failures (404, 500, 502, 503) on main page load
            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest?,
                errorResponse: WebResourceResponse?
            ) {
                super.onReceivedHttpError(view, request, errorResponse)
                if (request?.isForMainFrame == true) {
                    val failingUrl = request.url?.toString() ?: currentTargetUrl
                    if (failingUrl != LOCAL_ASSET_URL) {
                        // Silently and smoothly fall back to local bundled offline player
                        runOnUiThread {
                            loadServerUrl(LOCAL_ASSET_URL)
                        }
                    }
                }
            }

            // Catch Network / DNS / Connection failures
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    val failingUrl = request.url?.toString() ?: currentTargetUrl
                    if (failingUrl != LOCAL_ASSET_URL) {
                        // Silently and smoothly fall back to local bundled offline player
                        runOnUiThread {
                            loadServerUrl(LOCAL_ASSET_URL)
                        }
                    }
                }
            }
        }

        webView.webChromeClient = WebChromeClient()
    }

    private fun setupErrorOverlayListeners() {
        btnConnect.setOnClickListener {
            val inputUrl = etServerUrl.text.toString().trim()
            if (inputUrl.isNotEmpty()) {
                val formattedUrl = if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://") && !inputUrl.startsWith("file://")) {
                    "http://$inputUrl"
                } else {
                    inputUrl
                }
                saveAndLoadUrl(formattedUrl)
            }
        }

        btnRetry.setOnClickListener {
            errorLayout.visibility = View.GONE
            webView.visibility = View.VISIBLE
            loadServerUrl(currentTargetUrl)
        }

        btnLocalUi.setOnClickListener {
            saveAndLoadUrl(LOCAL_ASSET_URL)
        }
    }

    private fun saveAndLoadUrl(url: String) {
        currentTargetUrl = url
        prefs.edit().putString(KEY_SERVER_URL, url).apply()
        errorLayout.visibility = View.GONE
        webView.visibility = View.VISIBLE
        loadServerUrl(url)
    }

    private fun loadServerUrl(url: String) {
        loadingIndicator.visibility = View.VISIBLE
        webView.loadUrl(url)
    }

    private fun showErrorScreen(title: String, details: String, failedUrl: String) {
        runOnUiThread {
            loadingIndicator.visibility = View.GONE
            webView.visibility = View.GONE
            errorLayout.visibility = View.VISIBLE

            tvErrorTitle.text = title
            tvErrorDetails.text = details

            if (failedUrl != LOCAL_ASSET_URL) {
                etServerUrl.setText(failedUrl)
            } else {
                etServerUrl.setText("")
            }

            // Set default focus on the input or connect button for TV D-pad remote
            btnConnect.requestFocus()
        }
    }

    private fun toggleSettingsOverlay() {
        if (errorLayout.visibility == View.VISIBLE) {
            errorLayout.visibility = View.GONE
            webView.visibility = View.VISIBLE
        } else {
            showErrorScreen(
                title = "SnapTV Server Settings",
                details = "Configure or change your streaming server IP or domain address.",
                failedUrl = currentTargetUrl
            )
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // Pressing MENU key on TV Remote brings up Server Settings
        if (keyCode == KeyEvent.KEYCODE_MENU || keyCode == KeyEvent.KEYCODE_SETTINGS) {
            toggleSettingsOverlay()
            return true
        }

        // Back button navigation
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            // If settings overlay is visible and webview has loaded content, close overlay
            if (errorLayout.visibility == View.VISIBLE && webView.url != null) {
                errorLayout.visibility = View.GONE
                webView.visibility = View.VISIBLE
                return true
            }

            // Long press back check
            if (event?.isLongPress == true) {
                toggleSettingsOverlay()
                return true
            }

            // Normal back button handling in WebView
            if (webView.canGoBack()) {
                webView.goBack()
                return true
            }
        }

        return super.onKeyDown(keyCode, event)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
}
