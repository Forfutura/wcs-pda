<template>
  <div class="conTent-Nav">
    <div class="home">
      <van-button type="info" v-for="item in navButtons" :key="item.id" @click="jumprouter(item)">
        {{ item.areaName }}
      </van-button>
    </div>
  </div>
</template>
<script>
import { AreaInfo } from '@/api'
import { Toast } from 'vant'

export default {
  name: 'areaControl',
  data () {
    return {
      navButtons: []
    }
  },
  mounted () {
    this.GetAreaInfo()
  },
  methods: {
    async GetAreaInfo () {
      const result = await AreaInfo({
        pageNo: 1,
        pageSize: 10000
      })
      // 只列子库区：父库区只是分组壳、下面没有库位，点进去永远"暂无数据"。
      // 注意：接口在 parentId 为 NULL 时【根本不下发这个字段】（父区行的 JSON 里没有 parentId 键），
      // 所以"是子区"= parentId 存在且非空。写成 !item.parentId 会正好反选成"只列父区"，
      // 于是导航上全是空壳、点进去恒空 —— 曾经的线上故障就是这么来的。
      // 排序：父库区行在前、其子库区紧随，这样子区在导航里也是成组出现的。
      const list = (result && result.data ? result.data : []).filter(item => item.parentId != null)
      list.sort((a, b) => {
        const ga = a.parentId ? a.parentId : a.id
        const gb = b.parentId ? b.parentId : b.id
        if (ga !== gb) { return ga - gb }
        return String(a.areaCode).localeCompare(String(b.areaCode))
      })
      if (result.result === 0 && list.length !== 0) {
        this.navButtons = list
      } else {
        Toast('暂无数据!!')
      }
    },
    jumprouter (item) {
      this.$router.push({
        name: 'binControl',
        params: {
          binDetails: JSON.stringify(item)
        }
      })
    }
  }
}
</script>
<style lang="less" scoped>
.home {
  // height: 8rem;
  display: flex;
  flex-direction: column;
  align-items: center;

  button:first-child {
    margin: 0.05rem auto 0.05rem;
  }

  button {
    margin: 0.05rem auto;
    width: 50%;
    height: 0.36rem;
    font-size: 0.18rem;

    div {
      span {
        span {
          font-size: 0.24rem;
          padding: 0 0.06rem 0 0;
        }
      }
    }
  }
}
</style>
