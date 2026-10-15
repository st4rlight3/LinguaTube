package com.st4rlight3.linguatube;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.widget.FrameLayout;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

/** Keep YouTube's own video surface and controls intact in native fullscreen. */
public class MainActivity extends BridgeActivity {
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private int previousOrientation;
    private OnBackPressedCallback fullscreenBack;
    private boolean checkedLegacyShell;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (checkedLegacyShell || !url.startsWith(bridge.getLocalUrl())) return;
                checkedLegacyShell = true;
                // Migrate older APKs which accidentally installed the web PWA worker.
                // Remove only shell caches; keep guest history, vocabulary and transcripts.
                view.evaluateJavascript("(async()=>{"
                    + "if(!('serviceWorker' in navigator))return;"
                    + "const regs=await navigator.serviceWorker.getRegistrations();"
                    + "if(!regs.length)return;"
                    + "await Promise.all(regs.map(r=>r.unregister()));"
                    + "const keys=await caches.keys();"
                    + "await Promise.all(keys.filter(k=>k.startsWith('workbox-precache-')).map(k=>caches.delete(k)));"
                    + "location.reload();"
                    + "})().catch(e=>console.error('Native shell migration failed',e));", null);
            }
        });
        fullscreenBack = new OnBackPressedCallback(false) {
            @Override public void handleOnBackPressed() { exitFullscreen(); }
        };
        getOnBackPressedDispatcher().addCallback(this, fullscreenBack);
        bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) { callback.onCustomViewHidden(); return; }
                fullscreenView = view;
                fullscreenCallback = callback;
                previousOrientation = getRequestedOrientation();
                FrameLayout decor = (FrameLayout) getWindow().getDecorView();
                decor.addView(view, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                bridge.getWebView().setVisibility(View.INVISIBLE);
                WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), decor);
                bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                bars.hide(WindowInsetsCompat.Type.systemBars());
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                fullscreenBack.setEnabled(true);
            }
            @Override public void onHideCustomView() { exitFullscreen(); }
        });
    }

    private void exitFullscreen() {
        if (fullscreenView == null) return;
        ((ViewGroup) fullscreenView.getParent()).removeView(fullscreenView);
        fullscreenView = null;
        bridge.getWebView().setVisibility(View.VISIBLE);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .show(WindowInsetsCompat.Type.systemBars());
        setRequestedOrientation(previousOrientation);
        fullscreenBack.setEnabled(false);
        WebChromeClient.CustomViewCallback callback = fullscreenCallback;
        fullscreenCallback = null;
        if (callback != null) callback.onCustomViewHidden();
    }
}
