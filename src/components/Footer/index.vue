<template>
  <footer>
    <p :class="iconfd">{{ navName }}</p>
  </footer>
</template>
<script>
export default {
  name: "Footer",
  data() {
    return {
      navName: "首 页",
      iconfd: "iconfont icon-shouye-shouye",
    };
  },
  mounted() {},
  methods: {},
  watch: {
    $route(newName, oldName) {
      switch (newName.path) {
        case "/home":
          this.navName = "首页";
          this.iconfd = "iconfont icon-shouye-shouye"
          break;
        case "/productionmaterials":
          this.navName = "生产物料";
          this.iconfd = "iconfont icon-shejishengchan"
          break;
        case "/receiptwarehousing":
          this.navName = "收货入库";
          this.iconfd = "iconfont icon-ruku"
          break;
        case "/deliveryissue":
          this.navName = "发货出库";
          this.iconfd = "iconfont icon-chuku"
          break;
        case "/librarymanagement":
          this.navName = "移库管理";
          this.iconfd = "iconfont icon-yiku"
          break;
        case "/returnmanagement":
          this.navName = "退库管理";
          this.iconfd = "iconfont icon-tuiku"
          break;
        case "/lnventorymanagement":
          this.navName = "盘点管理";
          this.iconfd = "iconfont icon-kucunpandian-"
          break;
      }
    },
    deep: true,
    immediate: true,
  },
};
</script>
<style lang="less" scoped>
footer {
  position: fixed;
  bottom: 0;
  height: 0.48rem;
  width: 100%;
  span {
    line-height: 0.48rem;
    font-size: 0.24rem;
    text-align: center;
  }
}
</style>
