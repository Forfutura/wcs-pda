<template>
  <div id="app">
    <Header v-if="this.$route.meta.headerShow"/>
    <div class="sesrchSty"></div>
    <router-view/>
  </div>
</template>
<script>
import Header from '@/components/Header'

export default {
  name: 'App',
  components: {
    Header,
  },
}
</script>

<style lang="less">
html {
  height: 100%;
}

html {
  font-size: 100px !important;
}

#app {
  // min-height: 100%;
}

.sesrchSty {
  margin-top: 0.6rem;
}

// .conTent-Nav {
//   margin-top: 0.78rem;
// }

.conTent-Tab {
  margin-top: 0.48rem;
  padding: 0 0.08rem;
}
</style>
