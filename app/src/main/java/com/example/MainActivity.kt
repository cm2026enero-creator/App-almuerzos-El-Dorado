package com.example

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
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
        Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
          AppWebView(
            modifier = Modifier
              .fillMaxSize()
              .padding(innerPadding),
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

@Composable
fun AppWebView(
  modifier: Modifier = Modifier,
  onOpenFileChooser: (ValueCallback<Array<Uri>>, Intent) -> Unit
) {
  AndroidView(
    modifier = modifier,
    factory = { context ->
      WebView(context).apply {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.databaseEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webViewClient = object : WebViewClient() {
          override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
            if (url == null) return false
            if (url.startsWith("whatsapp://") || url.contains("api.whatsapp.com") || url.contains("wa.me")) {
              try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                context.startActivity(intent)
                return true
              } catch (e: Exception) {
                // If WhatsApp app is not installed, open in browser
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                context.startActivity(browserIntent)
                return true
              }
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

        loadUrl("file:///android_asset/index.html")
      }
    }
  )
}

