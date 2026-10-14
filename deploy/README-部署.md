# HB-PDA 部署说明

## 一、当前部署形态：网页版（8087）

PDA 用**浏览器**访问 `http://<服务器IP>:8087/` 即可，无需安装 APP。

- 前端静态文件 → `/opt/pda/dist`
- nginx 站点 → `/etc/nginx/conf.d/pda.conf`（监听 **8087**）
- API 请求走**同源反代**：前端用相对路径 `/api`，nginx 转给 WCS 后端 `127.0.0.1:8085`
  - 好处：不跨域、前端不写死服务器 IP，换 IP 不用重新打包

### nginx 安全约定（本机还跑着 RCS，务必遵守）

| 规则 | 原因 |
|---|---|
| 只新增 `conf.d/pda.conf` | 同机 RCS 的反代配置在 `sites-enabled/` 里，动它会打不开 RCS 网页 |
| 绝不删/改 `sites-enabled/*` | 同上 |
| 不用 `default_server` | 避免与现有 80/443 站点抢默认站点 |
| `nginx -t` 通过才 `reload` | 配置写错不会把 nginx 打挂；deploy.sh 失败会自动回滚 |
| 用 `reload` 不用 `restart` | 不断开其他站点已建立的连接 |

### 部署

```bash
cd deploy
sudo bash deploy.sh
```

脚本做三件事：拷前端到 `/opt/pda/dist` → 装 `conf.d/pda.conf` 并 `nginx -t` + `reload` → 冒烟测试。

### 验证

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8087/        # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8087/api/    # 由 WCS 后端应答
```

浏览器打开 `http://<服务器IP>:8087/`，用后台账号登录，建一张订单验证。

### 防火墙

```bash
sudo ufw allow 8087/tcp
```

### 回滚

```bash
sudo rm -f /etc/nginx/conf.d/pda.conf && sudo nginx -t && sudo systemctl reload nginx
```

---

## 二、APK 打包说明（保留备用）

网页版够用时不用打 APK。需要**离线安装的 APP** 时按下面来。

### 关键前提：改 API 地址

APK 里页面以 `file://` 加载，**相对路径 `/api` 无效**，必须改成后端绝对地址：

```js
// public/config.js
window.__APP_CONFIG__.API_BASE_URL = 'http://192.168.10.216:8085/api'
```

### 打包步骤（在开发机 Windows 上）

```bash
cd hb_pda-master

# 1) 改好 public/config.js 的绝对地址
# 2) 构建前端（--no-module 已内置在 npm run build，勿用 build:modern，部分 PDA WebView 会白屏）
npm run build

# 3) 同步到 Android 工程
npx cap sync android

# 4) 编 release APK（Capacitor 6 需 JDK 17；签名库已在 android/app/build.gradle 配好）
cd android
JAVA_HOME=~/.jdks/ms-17.0.19 ./gradlew assembleRelease
# Windows cmd 用: set JAVA_HOME=...  然后 gradlew.bat assembleRelease
```

产物：`android/app/build/outputs/apk/release/app-release.apk`

- 签名：`android/hbpda-release.keystore`（alias `hbpda`，口令在 `app/build.gradle` 内）
- `android/local.properties` 里 `sdk.dir` 指向 Android SDK（当前 `D:\android-sdk`）

### 装到 PDA

```bash
# 方式一：USB + adb（仓库根目录的脚本）
install-to-pda.bat

# 方式二：把 APK 拷到 PDA 上点安装
```

### 可选：把 APK 也挂到服务器供下载

如果之后想让 PDA 直接从服务器下载 APK，在 `pda.conf` 里加一段即可（**同样是改这一个文件、不碰其他站点**）：

```nginx
    # /opt/pda/apk/ 下放 app-release.apk
    location /apk/ {
        alias /opt/pda/apk/;
        autoindex on;
    }
```

然后 `sudo mkdir -p /opt/pda/apk && sudo cp app-release.apk /opt/pda/apk/`，
再 `sudo nginx -t && sudo systemctl reload nginx`。

---

## 三、常见问题

| 现象 | 原因/处理 |
|---|---|
| 打开 8087 白屏 | 用 `build:modern` 打了带 `type="module"` 的包；改回 `npm run build` 重新构建 |
| 接口 502 | WCS 后端 8085 没起；`systemctl status wcs` |
| 接口 404 | 后端 context-path 是 `/api`，确认 nginx 的 `location /api/` 转发到 `127.0.0.1:8085` |
| 登录接口跨域错误 | 用网页版应走同源 `/api`；若 config.js 被改成绝对地址就会跨域，改回 `/api` |
