#!/bin/bash
# ============================================================
# HB-PDA 网页版一键部署 (Ubuntu, 与 RCS / WCS 共存)
# 用法: 上传整个 deploy 目录到服务器, 以 root 执行:
#       cd deploy && bash deploy.sh
#
# ⚠️ nginx 安全约定(本机还跑着 RCS):
#   - 只 **新增** /etc/nginx/conf.d/pda.conf, 监听 8087
#   - 绝不修改/删除 /etc/nginx/sites-enabled/ 下任何文件
#   - 不用 default_server
#   - 先 nginx -t 校验, 通过才 reload; 失败自动回滚并中止
#   - 用 reload 不用 restart(不断开其他站点已有连接)
# ============================================================
set -e

cd "$(dirname "$0")"
echo "部署目录: $(pwd)"

DIST_SRC="./dist"
CONF_SRC="./pda.conf"
APP_DIR=/opt/pda
NGINX_CONF=/etc/nginx/conf.d/pda.conf
PORT=8087

[ "$(id -u)" = "0" ] || { echo "请用 root 执行"; exit 1; }
[ -d "$DIST_SRC" ] || { echo "缺少 $DIST_SRC (前端构建产物)"; exit 1; }
[ -f "$CONF_SRC" ] || { echo "缺少 $CONF_SRC"; exit 1; }
command -v nginx >/dev/null 2>&1 || { echo "未装 nginx (WCS 部署时装过), 请先确认"; exit 1; }
curl -s -o /dev/null --max-time 3 http://127.0.0.1:8085/api/ \
    || echo "    [警告] WCS 后端 8085 无响应, PDA 接口( /api )会 502, 先确认 WCS 在跑"

echo "==> [1/3] 部署前端静态文件到 $APP_DIR/dist"
mkdir -p "$APP_DIR"
rm -rf "$APP_DIR/dist"
cp -r "$DIST_SRC" "$APP_DIR/dist"
echo "    config.js 里的 API 地址:"
grep -oE "API_BASE_URL = .*" "$APP_DIR/dist/config.js" | head -1 | sed 's/^/      /'

echo "==> [2/3] 安装 nginx 配置 (只新增 $NGINX_CONF, 不碰任何现有站点)"
# 已有同名文件先留备份, 便于校验失败时回滚
if [ -f "$NGINX_CONF" ]; then cp -f "$NGINX_CONF" /tmp/pda.conf.bak; fi
cp -f "$CONF_SRC" "$NGINX_CONF"

if nginx -t 2>/tmp/nginx_t.err; then
    systemctl reload nginx
    echo "    nginx 配置校验通过, 已 reload"
else
    echo "    !! nginx -t 失败, 已回滚, 未改动运行中的 nginx:"
    sed 's/^/      /' /tmp/nginx_t.err
    if [ -f /tmp/pda.conf.bak ]; then cp -f /tmp/pda.conf.bak "$NGINX_CONF"; else rm -f "$NGINX_CONF"; fi
    exit 1
fi

echo "==> [3/3] 冒烟测试"
sleep 2
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:$PORT/ || true)
echo "    PDA 网页 http://127.0.0.1:$PORT/  ->  HTTP $CODE"
[ "$CODE" = "200" ] || echo "    !! 前端异常, 检查 $APP_DIR/dist 与 nginx 日志"

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "部署完成:  http://$IP:$PORT/     (PDA 浏览器直接打开)"
echo ""
echo "提醒:"
echo "  - 防火墙放行 $PORT:   sudo ufw allow $PORT/tcp"
echo "  - PDA 走浏览器访问即可用; 若要装 APK, 见 README-部署.md 的 [APK 打包说明]"
echo "  - 回滚: sudo rm -f $NGINX_CONF && sudo systemctl reload nginx"
