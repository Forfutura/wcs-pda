const { defineConfig } = require('@vue/cli-service')
// HBuilder 打包 APK 时页面以 file:// 加载，勿用 type="module" 脚本（部分 PDA WebView 会白屏）。
// 默认 npm run build 已带 --no-module；仅网页部署可用 npm run build:modern。
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  publicPath: './',
  productionSourceMap: false,
  // 禁止给 script 加 crossorigin，避免 file:// / HBuilder 本地加载异常
  crossorigin: undefined,
  chainWebpack (config) {
    config.plugin('html').tap((args) => {
      // 强制去除 type="module" 和 nomodule，只保留普通 <script src>
      // Vue CLI 5 会生成 modern/legacy 双包，HBuilder WebView 部分版本
      // 不能正确识别 type="module" 导致 JS 不执行白屏
      // 此处用 inject:false + 自定义 templateContent 完全控制 script 注入
      args[0].scriptLoading = 'blocking'
      return args
    })

    // 移除 preload/prefetch 插件，减少不必要的 link 标签
    config.plugins.delete('preload')
    config.plugins.delete('prefetch')

    // 构建完成后修补 index.html：把所有 type="module" 改为普通 script，移除 nomodule 脚本
    config.plugin('html-patch').use(
      class HtmlPatchPlugin {
        apply (compiler) {
          compiler.hooks.emit.tap('HtmlPatchPlugin', (compilation) => {
            const htmlKey = Object.keys(compilation.assets).find(k => k.endsWith('index.html'))
            if (!htmlKey) return
            let html = compilation.assets[htmlKey].source()
            // 1. 把 type="module" script 改为普通 script（去掉 type="module"）
            html = html.replace(/<script type="module"/g, '<script')
            // 2. 删除 nomodule 的 legacy 脚本（整个 script 标签，包括 chunk-vendors-legacy 和 app-legacy）
            html = html.replace(/<script[^>]*nomodule[^>]*>.*?<\/script>/g, '')
            html = html.replace(/<script[^>]*-legacy\.[^>]*><\/script>/g, '')
            compilation.assets[htmlKey] = {
              source: () => html,
              size: () => html.length
            }
          })
        }
      }
    )
    // 所有路由已改为同步 import，关闭 splitChunks，
    // 打包结果只有 chunk-vendors.js + app.js，不产生任何异步 chunk
    // 避免 HBuilder WebView 在 file:// 下加载异步 chunk 失败导致白屏
    config.optimization.splitChunks({
      cacheGroups: {
        default: false,
        vendors: {
          name: 'chunk-vendors',
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
          priority: 10,
          enforce: true
        }
      }
    })
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8085', // WCS 服务端口(上下文 /api)；真机部署改 public/config.js 的 API_BASE_URL
        pathRewrite: {
          // '^/api': ''
        },
        changeOrigin: true
      }
    },
    server: {
      type: 'http'
    },
    host: '0.0.0.0',
    port: 8081,
    client: {
      webSocketURL: 'ws://0.0.0.0:8081/ws'
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
})
