<template>
  <div class="receiptWarehousing">
    <van-divider :style="{ color: '#1989fa', borderColor: '#1989fa', padding: '0 16px' }">
      占用库位详情
    </van-divider>

    <van-cell-group>
      <van-cell title="库位" :value="location.code || location.locationCode || '-'" />
      <van-cell title="状态" :value="formatStatus(location.status)" />
    </van-cell-group>

    <van-divider :style="{ color: '#1989fa', borderColor: '#1989fa', padding: '0 16px' }">
      绑定信息
    </van-divider>

    <div v-if="loading" class="loading">
      <van-loading size="24px">加载中...</van-loading>
    </div>

    <div v-else>
      <van-empty v-if="records.length === 0" description="暂无绑定信息" />

      <div v-else>
        <div v-for="(row, idx) in records" :key="idx" class="card">
          <van-cell-group>
            <van-cell title="箱体编码" :value="row.boxCode || '-'" />
            <van-cell title="卡板编码" :value="row.palletCode || row.palletNo || '-'" />
            <van-cell title="订单编码" :value="row.orderCode || row.soOrderCode || row.SOVoucher || '-'" />
            <van-cell title="产品编码" :value="row.productCode || '-'" />
            <van-cell title="产品名称" :value="row.productName || row.productDescription || '-'" />
            <van-cell title="数量" :value="row.produceQuantity || row.quantity || '-'" />
          </van-cell-group>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <van-button type="info" block :loading="loading" @click="confirmFree">改为空闲</van-button>
    </div>
  </div>
</template>

<script>
import { Dialog, Toast } from 'vant'
import { selectOrderLocation, updateLocationInfo } from '@/api'

export default {
  name: 'binOccupiedDetail',
  data () {
    return {
      location: {
        code: this.$route.query.locationCode || null,
        id: this.$route.query.locationId || null,
        status: this.$route.query.status !== undefined ? Number(this.$route.query.status) : null
      },
      loading: false,
      records: []
    }
  },
  mounted () {
    this.fetchBindingInfo()
  },
  methods: {
    formatStatus (status) {
      if (status === 0) return '禁用'
      if (status === 1) return '空闲'
      if (status === 2) return '占用'
      if (status === 3) return '占用'
      if (status === 4) return '占用'
      return status === undefined || status === null ? '-' : String(status)
    },
    async fetchBindingInfo () {
      const locationCode = this.location.code || this.location.locationCode
      if (!locationCode) {
        Toast('缺少库位编码')
        return
      }

      this.loading = true
      try {
        const res = await selectOrderLocation({ locationCode })
        if (res && res.data) {
          this.records = Array.isArray(res.data) ? res.data : [res.data]
        } else {
          this.records = []
        }
      } catch (e) {
        this.records = []
        Toast('获取绑定信息失败')
      } finally {
        this.loading = false
      }
    },
    async confirmFree () {
      const locationId = this.location.id || this.location.locationId
      const locationCode = this.location.code || this.location.locationCode
      if (!locationId) {
        Toast('缺少库位ID')
        return
      }

      Dialog.confirm({
        message: `确定将库位 ${locationCode || ''} 修改为空闲吗？`
      }).then(async () => {
        this.loading = true
        try {
          const result = await updateLocationInfo({
            url: '/warehouseLocation/free',
            data: [locationId]
          })
          Toast(result && result.message ? result.message : '操作成功')
          if (result && result.result === 0) {
            this.$bus && this.$bus.$emit('bin-location-status-updated', { locationId })
            this.$router.back()
          }
        } catch (e) {
          Toast('操作失败')
        } finally {
          this.loading = false
        }
      }).catch(() => {
      })
    }
  }
}
</script>

<style lang="less" scoped>
.loading {
  padding: 16px;
  display: flex;
  justify-content: center;
}

.card {
  margin: 10px 0;
}

.receiptWarehousing {
  padding-bottom: 70px;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 16px;
  background: #fff;
}
</style>
