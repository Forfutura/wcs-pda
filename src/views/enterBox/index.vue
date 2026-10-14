<template>
  <div class="receiptWarehousing">
    <div class="librarymanag">
      <van-button
        type="info"
        v-for="item in navButtons"
        :key="item.keyId"
        @click="jumprouter(item)"
      >
        <span :class="item.iconfd"></span>
        {{ item.navName }}
      </van-button>
    </div>
  </div>
</template>
<script>
export default {
  name: "artificial",
  data() {
    return {
      navButtons: [
        {
          navName: "人工入库",
          keyId: "/artificial/enterBox",
          iconfd: "iconfont icon-chuangjianrenwu1",
        },
        {
          navName: "人工出库",
          keyId: "/artificial/goBox",
          iconfd: "iconfont icon-renwu",
        },
      ],
    };
  },
  methods: {
    jumprouter(item) {
      this.$router.push(item.keyId);
    },
  },
};
</script>
<style lang="less" scoped>


</style>
