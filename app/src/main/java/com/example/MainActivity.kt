package com.example

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {

  private var filePathCallback: ValueCallback<Array<Uri>>? = null

  private val fileChooserLauncher = registerForActivityResult(
    ActivityResultContracts.StartActivityForResult()
  ) { result ->
    if (filePathCallback != null) {
      val data = result.data
      val results = if (result.resultCode == RESULT_OK && data != null) {
        val dataString = data.dataString
        if (dataString != null) {
          arrayOf(Uri.parse(dataString))
        } else null
      } else null
      filePathCallback?.onReceiveValue(results)
      filePathCallback = null
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        var webViewInstance by remember { mutableStateOf<WebView?>(null) }

        BackHandler(enabled = webViewInstance?.canGoBack() == true) {
          webViewInstance?.goBack()
        }

        Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
          AppWebView(
            modifier = Modifier
              .fillMaxSize()
              .padding(innerPadding),
            onWebViewCreated = { webViewInstance = it },
            onOpenFileChooser = { callback, intent ->
              filePathCallback = callback
              fileChooserLauncher.launch(intent)
            }
          )
        }
      }
    }
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AppWebView(
  modifier: Modifier = Modifier,
  onWebViewCreated: (WebView) -> Unit,
  onOpenFileChooser: (ValueCallback<Array<Uri>>, Intent) -> Unit
) {
  AndroidView(
    modifier = modifier,
    factory = { context ->
      WebView(context).apply {
        settings.apply {
          javaScriptEnabled = true
          domStorageEnabled = true
          allowFileAccess = true
          allowContentAccess = true
          databaseEnabled = true
          cacheMode = WebSettings.LOAD_DEFAULT
          useWideViewPort = true
          loadWithOverviewMode = true
          mediaPlaybackRequiresUserGesture = false
          mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
          @Suppress("DEPRECATION")
          allowFileAccessFromFileURLs = true
          @Suppress("DEPRECATION")
          allowUniversalAccessFromFileURLs = true
        }

        webViewClient = object : WebViewClient() {
          override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
            val url = request?.url?.toString() ?: return false
            return handleCustomUrl(url, view)
          }

          @Suppress("DEPRECATION")
          override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
            if (url == null) return false
            return handleCustomUrl(url, view)
          }

          private fun handleCustomUrl(url: String, view: WebView?): Boolean {
            if (url.startsWith("whatsapp://") || url.contains("api.whatsapp.com") || url.contains("wa.me")) {
              try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                context.startActivity(intent)
                return true
              } catch (e: Exception) {
                try {
                  val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                  context.startActivity(browserIntent)
                  return true
                } catch (_: Exception) {
                  return false
                }
              }
            }
            if (url.startsWith("file://") || url.startsWith("about:")) {
              return false
            }
            return false
          }
        }

        webChromeClient = object : WebChromeClient() {
          override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>?,
            fileChooserParams: FileChooserParams?
          ): Boolean {
            if (filePathCallback != null && fileChooserParams != null) {
              val intent = fileChooserParams.createIntent()
              onOpenFileChooser(filePathCallback, intent)
              return true
            }
            return false
          }
        }

        onWebViewCreated(this)
        loadUrl("file:///android_asset/index.html")
      }
    }
  )
}

