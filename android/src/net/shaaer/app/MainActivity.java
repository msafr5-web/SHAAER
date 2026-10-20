package net.shaaer.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;

/**
 * تطبيق شاعر: المنصة نفسها بملء الشاشة، فلا نسخة ثانية من البيانات ولا يُخزَّن عقد على الجهاز.
 * روابط shaaer.net تبقى في التطبيق، وما سواها (والملفات المصدَّرة) يُفتح في المتصفح.
 */
public class MainActivity extends Activity {
    private static final String HOST = "shaaer.net";
    private static final String HOME = "https://" + HOST + "/dashboard";
    private static final String OFFLINE = "file:///android_asset/offline.html";

    private WebView web;
    private ProgressBar progress;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        FrameLayout root = new FrameLayout(this);
        web = new WebView(this);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setIndeterminate(true);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(progress, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 12));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " ShaaerApp/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int p) {
                progress.setVisibility(p < 100 ? View.VISIBLE : View.GONE);
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("https".equals(u.getScheme()) && HOST.equals(u.getHost())) return false;
                openExternal(u);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap icon) {
                progress.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // تُحفظ الجلسة على القرص فوراً، كي لا يخرج المستخدم إن أُغلق التطبيق قبل الحفظ الدوري
                CookieManager.getInstance().flush();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) view.loadUrl(OFFLINE);
            }
        });
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String ua, String disposition, String mime, long length) {
                openExternal(Uri.parse(url));
            }
        });

        if (state != null) web.restoreState(state);
        else web.loadUrl(startUrl(getIntent()));
    }

    private String startUrl(Intent intent) {
        Uri u = intent == null ? null : intent.getData();
        return u != null && HOST.equals(u.getHost()) ? u.toString() : HOME;
    }

    private void openExternal(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (ActivityNotFoundException ignored) {
            // لا تطبيق يفتح هذا الرابط
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent.getData() != null) web.loadUrl(startUrl(intent));
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack() && !OFFLINE.equals(web.getUrl())) web.goBack();
        else super.onBackPressed();
    }
}
