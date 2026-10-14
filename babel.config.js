module.exports = {
  presets: [
    ['@vue/cli-plugin-babel/preset', {
      // 明确指定 targets，让 Vue CLI 认为无需生成 legacy 包
      // HBuilder WebView >= Android 5 已支持 ES2015，无需 nomodule fallback
      targets: { android: 5, chrome: 49 }
    }]
  ],
  plugins: [
    ['import', {
      libraryName: 'vant',
      libraryDirectory: 'es',
      style: true
    }, 'vant']
  ]
}
