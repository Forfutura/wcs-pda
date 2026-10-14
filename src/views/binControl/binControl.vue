<template>
  <div class="receiptWarehousing">
    <div class="taskList top">
      <van-divider :style="{ color: '#1989fa', borderColor: '#1989fa', padding: '0 16px' }">
        库区：{{ binDetails.areaCode }}{{ binDetails.areaName ? '（' + binDetails.areaName + '）' : '' }}
      </van-divider>
      <div style="margin: 0;padding: 0;">
        <p style="background:#fff;width:50%;margin: 0;padding: 0;">
          <span>库位层数：</span>
        </p>
        <p style="margin: 0;padding: 0;">
          <van-dropdown-menu>
            <van-dropdown-item v-model="layer" :options="layerList" @change="optstartAreaId"/>
          </van-dropdown-menu>
        </p>
      </div>
    </div>
    <div class="div-main">
      <van-grid :gutter="10" :column-num="3">
        <van-grid-item v-for="item in BinList" :key="item.locationId" style="height: 0.3rem;"
                       :class="{ 'bin-selected': isSelected(item) }">
          <van-button type="primary" v-if="item.status === 0 || item.status === 1" @click="binClick(item)">{{
              item.code + (item.productCode ? ' | ' + item.productCode + (item.productLot ? '|' + item.productLot.slice(0, 2) + '_' + item.productLot.slice(-4) : '') : '')
            }}
          </van-button>
          <van-button type="warning" v-else-if="item.status === 2 || item.status === 3 || item.status === 4"
                      @click="binClick(item)">{{ item.code + (item.productCode ? ' | ' + item.productCode + (item.productLot ? '|' + item.productLot.slice(0, 2) + '_' + item.productLot.slice(-4) : '') : '') }}
          </van-button>
          <!-- 非 0~4 的异常状态：正常模式下不可点；多选模式下允许勾选后统一改回 -->
          <van-button :disabled="!multiMode" type="info" v-else @click="binClick(item)">{{
              item.code + (item.productCode ? ' | ' + item.productCode + (item.productLot ? '|' + item.productLot.slice(0, 2) + '_' + item.productLot.slice(-4) : '') : '')
            }}
          </van-button>
        </van-grid-item>
      </van-grid>
    </div>
    <div class="taskList bottom">
      <!-- 多选模式：先勾选若干库位，再一次性改状态 -->
      <div v-if="multiMode" style="display: flex; justify-content: center; text-align: center; margin-bottom: 4px;">
        <p style="background:#fff; width: 100%; margin: 0;">已选 {{ selectedIds.length }} 个库位</p>
      </div>
      <div v-if="multiMode" style="display: flex; justify-content: center; gap: 2%; text-align: center;">
        <p style="background:#f7f8fa; border-radius:4px; text-align:center; width: 23%;" @click="clearSelected">
          清空</p>
        <p style="background:#f7f8fa; border-radius:4px; text-align:center; width: 23%;" @click="selectAllVisible">
          全选</p>
        <p style="background:#ff976a; border-radius:4px; text-align:center; width: 23%;" @click="batchUpdateStatus(2)">
          设为占用</p>
        <p style="background:#07c160; border-radius:4px; text-align:center; width: 23%;" @click="batchUpdateStatus(1)">
          设为空闲</p>
      </div>
      <div v-else style="display: flex; justify-content: center; gap: 4%; text-align: center;">
        <p style="background:#1989fa; border-radius:4px; text-align:center; width: 28%;" @click="toggleMultiMode">
          多选</p>
        <p style="background:#ff976a; border-radius:4px; text-align:center; width: 28%;" @click="binClick(2)">
          全部占用</p>
        <p style="background:#07c160; border-radius:4px; text-align:center; width: 28%;" @click="binClick(1)">
          全部空闲</p>
      </div>
    </div>

  </div>
</template>
<script>
import { LocationInfo, updateBins, updateLocationInfo } from '@/api'
import { Dialog, Toast } from 'vant'

export default {
  name: 'binControl',
  data () {
    return {
      BinList: [],
      binDetails: JSON.parse(this.$route.params.binDetails),
      layerList: [],
      layer: null,
      // 多选模式：勾选若干库位后一次性改状态（不改后端，接口本来就收 id 数组）
      multiMode: false,
      selectedIds: []
    }
  },
  mounted () {
    this.$bus && this.$bus.$on('bin-location-status-updated', this.onLocationStatusUpdated)
    this.layerList = [
      {
        text: '全部',
        value: null
      }
    ]
    this.GetLocationInfo(JSON.parse(this.$route.params.binDetails))
    for (let index = 0; index < this.binDetails.layers; index++) {
      const obj = {}
      obj.text = index + 1
      obj.value = index + 1
      this.layerList.push(obj)
    }
  },
  beforeDestroy () {
    this.$bus && this.$bus.$off('bin-location-status-updated', this.onLocationStatusUpdated)
  },
  methods: {
    onLocationStatusUpdated () {
      this.GetLocationInfo(this.binDetails)
    },
    async GetLocationInfo (binDetails) {
      this.BinList = []
      this.selectedIds = []
      const result = await LocationInfo({
        pageNo: 1,
        pageSize: 10000,
        areaId: binDetails.id
      })
      if (result.result === 0 && result.total !== 0) {
        // eslint-disable-next-line array-callback-return
        result.data.map(item => {
          this.BinList.push({
            ...item,
            showPopover: false
          })
        })
      } else {
        Toast('暂无数据!!')
      }
    },
    toggleMultiMode () {
      this.multiMode = !this.multiMode
      this.selectedIds = []
    },
    isSelected (item) {
      return this.selectedIds.indexOf(item.id) !== -1
    },
    toggleSelect (item) {
      const index = this.selectedIds.indexOf(item.id)
      if (index === -1) {
        this.selectedIds.push(item.id)
      } else {
        this.selectedIds.splice(index, 1)
      }
    },
    clearSelected () {
      this.selectedIds = []
    },
    selectAllVisible () {
      this.selectedIds = this.BinList.map(item => item.id)
    },
    // 一次性把选中的库位改成占用(2)/空闲(1)：payload 就是 id 数组，后端本来就是批量接口
    async batchUpdateStatus (status) {
      if (this.selectedIds.length === 0) {
        Toast('请先选择库位')
        return
      }
      const label = status === 2 ? '占用' : '空闲'
      try {
        await Dialog.confirm({
          message: `确认将选中的 ${this.selectedIds.length} 个库位改为${label}吗？`
        })
      } catch (e) {
        return
      }
      const result = await updateLocationInfo({
        url: status === 2 ? '/warehouseLocation/occupation' : '/warehouseLocation/free',
        data: this.selectedIds.slice()
      })
      Toast(result.message)
      if (result.result === 0) {
        this.GetLocationInfo(this.binDetails)
      }
    },
    async binClick (item) {
      // 多选模式：点库位只勾选/取消，不立即改状态、也不跳详情
      if (this.multiMode && typeof item === 'object') {
        this.toggleSelect(item)
        return
      }
      if (item === 1 || item === 2) {
        let message = ''
        if (item === 2) {
          message = `确认将库区 ${this.binDetails.areaCode} 下所有空闲库位并修改为占用吗？`
        } else {
          message = `确认将库区 ${this.binDetails.areaCode} 下所有库位修改为空闲吗？`
        }
        Dialog.confirm({
          message: message
        }).then(async () => {
          if (item === 1) {
            const result = await updateBins({
              url: '/warehouseAreaInfo/free',
              data: [this.binDetails.id]
            })
            Toast(result.message)
            if (result.result === 0) {
              this.GetLocationInfo(this.binDetails)
            }
          }
          if (item === 2) {
            const result = await updateBins({
              url: '/warehouseAreaInfo/occupation',
              data: [this.binDetails.id]
            })
            Toast(result.message)
            if (result.result === 0) {
              this.GetLocationInfo(this.binDetails)
            }
          }
        }).catch(() => {
        })
      } else {
        if (item.status === 2 || item.status === 3 || item.status === 4) {
          this.$router.push({
            name: 'binOccupiedDetail',
            query: {
              locationCode: item.code || item.locationCode,
              locationId: item.id || item.locationId,
              status: item.status
            }
          })
          return
        }
        let message = ''
        if (item.status === 1) {
          message = `确认将库位 ${item.code} 修改为占用吗？`
        } else {
          message = `确认将库位 ${item.code} 修改为空闲吗？`
        }
        Dialog.confirm({
          message: message
        }).then(async () => {
          if (item.status === 1) {
            const result = await updateLocationInfo({
              url: '/warehouseLocation/occupation',
              data: [item.id]
            })
            Toast(result.message)
            if (result.result === 0) {
              this.GetLocationInfo(this.binDetails)
            }
          } else {
            const result = await updateLocationInfo({
              url: '/warehouseLocation/free',
              data: [item.id]
            })
            Toast(result.message)
            if (result.result === 0) {
              this.GetLocationInfo(this.binDetails)
            }
          }
        }).catch(() => {
        })
      }
    },
    async optstartAreaId (value) {
      this.BinList = []
      this.selectedIds = []
      const result = await LocationInfo({
        pageNo: 1,
        pageSize: 10000,
        areaId: this.binDetails.id,
        layer: value
      })
      if (result.result === 0 && result.total !== 0) {
        // eslint-disable-next-line array-callback-return
        result.data.map(item => {
          this.BinList.push({
            ...item,
            showPopover: false
          })
        })
      } else {
        Toast('暂无数据!!')
      }
    }
  }
}
</script>
<style lang="less" scoped>
::v-deep .van-grid-item__content {
  padding: 0;
}

.van-grid {
  margin-top: 35px;
}

.div-main {
  padding-top: 50px;
  padding-bottom: 50px;
}

::v-deep .van-button {
  width: 100%;
  height: 100%;
}

/* 多选模式：选中的库位加红框 + 右上角对勾（不改按钮内部结构，纯叠加） */
::v-deep .van-grid-item.bin-selected .van-button {
  outline: 2px solid #ee0a24;
  outline-offset: -2px;
  opacity: 0.75;
}

::v-deep .van-grid-item.bin-selected .van-grid-item__content::after {
  content: '✓';
  position: absolute;
  top: 0;
  right: 2px;
  color: #ee0a24;
  font-size: 0.16rem;
  font-weight: bold;
  line-height: 1;
  z-index: 2;
}

::v-deep .van-grid-item__content {
  position: relative;
}

.top {
  z-index: 1;
  position: fixed;
  top: 0.45rem;
  padding-bottom: 10px;
  background-color: white;
  text-indent: 0.1rem;
}

.bottom {
  z-index: 1;
  position: fixed;
  bottom: 0;
  padding: 8px 0 10px 0;
  background-color: white;
}

.taskList {
  width: 100%;

  div {
    font-size: 0.14rem;
    display: flex;

    p {
      height: 0.26rem;
      width: 100%;
      background: #f7f8fa;
      line-height: 0.26rem;

      .button {
        width: 100%;
        height: 100%;
        padding: 0.04rem 0 0 0;
      }

      .van-progress {
        margin-top: 0.11rem;
      }
    }

    .Nameinfo {
      width: 1.3rem;
      background: #fff;
    }
  }
}

#dialog-select {
  display: flex;
  float: left;
}

::v-deep .van-dropdown-menu__bar, .van-dropdown-menu__item {
  height: 0.26rem;
  margin: -4px 0 0 -4px;
}

::v-deep .van-icon-success:before {
  margin-left: -20px;
  content: '\e728';
}

</style>
