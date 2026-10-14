package com.hb.pda;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static final int REQUEST_CAMERA = 1001;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // 启动即申请相机权限：WebView 里 @zxing/library 的 getUserMedia 摄像头扫码需要
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(
        this,
        new String[] { Manifest.permission.CAMERA },
        REQUEST_CAMERA
      );
    }
  }
}
