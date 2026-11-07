package com.caststream.tv

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    // Production URL (Update with your custom domain or Cloud Run / Render URL)
    private val appUrl = "https://ais-pre-jcetwnrxuzzspyj6t4f5so-743295118995.asia-northeast1.run.app"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep TV screen awake during video streaming
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Hide navigation bars for 10-foot borderless TV experience
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        configureWebView()

        if (savedInstanceState == null) {
            webView.loadUrl(appUrl)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings: WebSettings = webView.settings

        // Enable full HTML5 and modern JS execution
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // Allow instant video playback on Smart TVs without requiring mouse click
        settings.mediaPlaybackRequiresUserGesture = false

        // Disallow ad popups from opening new windows or tab loops on Android TV
        settings.javaScriptCanOpenWindowsAutomatically = false
        settings.setSupportMultipleWindows(false)

        // Enable hardware acceleration for 60fps video rendering
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // Custom User-Agent allowing full Smart TV HLS streaming
        val defaultUserAgent = settings.userAgentString
        settings.userAgentString = "$defaultUserAgent SnapTV/1.0 (Android TV; Leanback)"

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                // Prevent rogue redirects to malicious ad networks
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
        }

        webView.webChromeClient = WebChromeClient()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
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
