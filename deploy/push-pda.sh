#!/bin/bash
# ============================================================
# HB-PDA 网页版【增量推送】—— 只换 /opt/pda/dist 里的静态文件
#
# 与 deploy.sh 的区别（重要）：
#   - 不 rm 掉就完事：先把现有 /opt/pda/dist **整目录改名备份** 成 dist.bak-<时间戳>，
#     出问题一分钟回滚（不动 nginx、不动后端、不动库）
#   - **完全不碰 nginx 配置**：pda.conf 上次部署时已装好，8087 站点这次没有任何改动，
#     所以不存在影响同机 RCS 站点的风险
#   - 全程校验：上传 md5 核对 → 落盘后首页 HTTP 200 → 首页引用的 app.<hash>.js 与服务端
#     实际文件 md5 与本地构建逐字节一致
#
# 用法（开发机 Git Bash，已配好免口令 SSH）：
#   SSH_ASKPASS=/tmp/askpass_nanci.sh SSH_ASKPASS_REQUIRE=force DISPLAY=:0 \
#     bash deploy/push-pda.sh [deploy/pda-dist-YYYYMMDD.tar.gz]
#   不带参数时自动取 deploy/ 下最新的 pda-dist-*.tar.gz
#
# 服务器侧 sudo 要口令：远端需有 ~/.ask_nanci.sh（内容就一行 echo '<口令>'）
# ============================================================
set -euo pipefail

HOST="${PDA_HOST:-user@192.168.10.4}"
PORT="${PDA_PORT:-8087}"

cd "$(dirname "$0")"
DIST_DIR="./dist"

TARBALL="${1:-$(ls -t pda-dist-*.tar.gz 2>/dev/null | head -1 || true)}"
[ -n "${TARBALL}" ] || { echo "!! 找不到 tarball（deploy/pda-dist-*.tar.gz）"; exit 1; }
[ -f "${TARBALL}" ] || { echo "!! 文件不存在: ${TARBALL}"; exit 1; }
NAME="$(basename "${TARBALL}")"
LOCAL_MD5="$(md5sum "${TARBALL}" | cut -d' ' -f1)"

echo "==> 上传 ${NAME}（md5 ${LOCAL_MD5}）到 ${HOST}:/home/user/"
scp "${TARBALL}" "${HOST}:/home/user/${NAME}"

echo "==> 服务器上落盘（备份 + 覆盖 + 冒烟）"
ssh "${HOST}" "bash -s -- /home/user/${NAME} ${LOCAL_MD5} ${PORT}" <<'REMOTE'
set -e
TAR="$1"; WANT_MD5="$2"; PORT="$3"

REMOTE_MD5=$(md5sum "$TAR" | cut -d' ' -f1)
if [ "$REMOTE_MD5" != "$WANT_MD5" ]; then
    echo "!! 上传后 md5 不一致：$REMOTE_MD5 != $WANT_MD5，中止（线上未改动）"
    exit 1
fi
echo "    md5 核对通过"

SUDO_ASKPASS=$HOME/.ask_nanci.sh sudo -A -p "" sh -c "
    set -e
    rm -rf /home/user/pda_stage
    mkdir -p /home/user/pda_stage
    tar -xzf '$TAR' -C /home/user/pda_stage
    TS=\$(date +%Y%m%d-%H%M%S)
    mv /opt/pda/dist /opt/pda/dist.bak-\$TS
    cp -r /home/user/pda_stage /opt/pda/dist
    chown -R root:root /opt/pda/dist
    echo \"    已发布；回滚备份：/opt/pda/dist.bak-\$TS\"
    ls -l /opt/pda/dist/js
"

sleep 1
echo "---- 冒烟 ----"
curl -s -o /dev/null -w "    首页 HTTP %{http_code}\n" --max-time 5 "http://127.0.0.1:$PORT/" || true
JS=$(curl -s --max-time 5 "http://127.0.0.1:$PORT/" | grep -o 'js/app\.[a-f0-9]*\.js' | head -1 || true)
echo "    首页引用: ${JS:-（没解析到！检查 /opt/pda/dist/index.html）}"
if [ -n "$JS" ]; then
    echo -n "    服务端 $JS md5: "
    curl -s --max-time 5 "http://127.0.0.1:$PORT/$JS" | md5sum
fi
REMOTE

# 本地同一份文件的 md5，供逐字节对照
if [ -d "${DIST_DIR}" ]; then
    echo "---- 本地基准 ----"
    md5sum "${DIST_DIR}"/js/app.*.js 2>/dev/null || true
fi

echo ""
echo "完成。两处 app.*.js 的 md5 应完全一致。"
echo "回滚（一条命令）："
echo "  ssh ${HOST} 'SUDO_ASKPASS=\$HOME/.ask_nanci.sh sudo -A -p \"\" sh -c \"rm -rf /opt/pda/dist && mv /opt/pda/dist.bak-<时间戳> /opt/pda/dist\"'"
