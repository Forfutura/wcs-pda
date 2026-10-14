<template>
  <div class="receiptWarehousing">
    <div v-show="!loadingShow">
      <!-- 车辆类型 -->
      <div class="taskList">
        <div>
          <p class="expression" @click="openRowDropdown">车辆类型：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="vehicleType" :options="vehicleTypeList"></van-dropdown-item>
            </van-dropdown-menu>
          </div>
        </div>
      </div>

      <!-- 工序（AGV 定义驱动，菜单来自后端启用定义）/ CTU 任务类型 -->
      <div class="taskList">
        <div>
          <p class="expression" @click="openRowDropdown">{{ vehicleType === 'ctu' ? '任务类型：' : '工序：' }}</p>
          <div class="dd-wrap">
            <van-dropdown-menu v-if="vehicleType !== 'ctu'">
              <van-dropdown-item v-model="pickedDefCode" :options="definitionList" :disabled="definitionDisabled" @change="handlePickedDefChange"/>
            </van-dropdown-menu>
            <van-dropdown-menu v-else>
              <van-dropdown-item v-model="taskType" :options="ctuTaskTypeList" @change="handleTaskTypeChange"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>

      <!-- 任务类型 = RCS 任务链（agv_ds_task_chain_template，经 WCS 同步为 wcs_rcs_task_chain）。
           下发时作为 taskChainCode 带给 WCS，最终成为 RCS /task/create 的 taskChainNum。
           不选则由后端兜底为默认链；下拉为空（未同步/全停用）时不显示该行。 -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && taskChainList.length > 0">
        <div>
          <p class="expression" @click="openRowDropdown">任务类型：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="pickedTaskChain" :options="taskChainList" @change="handleTaskChainChange"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>

      <!-- 逆向搬运：打开后当前工序起点/终点库区对调（工序与任务类型不变），仍用「发起订单」下发。
           无工序时无意义、CTU 无此概念，故不显示。 -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && pickedDefCode">
        <div>
          <p class="expression">逆向搬运：</p>
          <div class="dd-wrap reverse-switch-wrap">
            <van-switch v-model="reverseMode" size="24" @change="handleReverseToggle"/>
          </div>
        </div>
        <p class="reverse-tip" v-if="reverseMode">逆向中：起点/终点库区已对调</p>
      </div>

      <!-- 批量任务下发：打开后**不用选库位**，按搬运顺序把起点(有货)与终点(空闲)一对一配对后批量下发；
           关闭后库位改为多选，按选择顺序第 k 个配第 k 个。两种模式都仍用「发起订单」提交。 -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && pickedDefCode">
        <div>
          <p class="expression">批量任务下发：</p>
          <div class="dd-wrap reverse-switch-wrap">
            <van-switch v-model="batchMode" size="24" :disabled="buttonDisabled" @change="handleBatchToggle"/>
          </div>
        </div>
        <p class="reverse-tip" v-if="batchMode">
          自动批量：当前最多可配对 {{ batchPlanTotal }} 条（顺序与后台「搬运顺序」一致）
        </p>
        <p class="reverse-tip" v-else>手动多选：起点/终点各自多选，按选择顺序一一配对</p>
        <p class="reverse-tip" v-if="batchProgress">{{ batchProgress }}</p>
      </div>

      <!-- 批量条数（仅自动批量时显示，默认全搬，可改小） -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && pickedDefCode && batchMode">
        <div>
          <p class="expression">下发条数：</p>
          <van-field
            v-model="batchCountInput"
            type="digit"
            placeholder="条数"
            class="batch-count-field"
            @blur="onBatchCountChange"
          />
          <van-button size="mini" type="info" plain @click="fillBatchCountAll">全搬</van-button>
        </div>
      </div>

      <!-- AGV托盘类型 -->
      <div class="taskList" v-if="vehicleType === 'agv' && show.palletTypeVisible">
        <div>
          <p class="expression" @click="openRowDropdown">托盘类型：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.palletType" :options="palletTypeList"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>      

      <!-- CTU 开始库区（出库时显示） -->
      <div class="taskList" v-if="vehicleType === 'ctu' && show.startAreaVisible">
        <div>
          <p class="expression" @click="openRowDropdown">开始库区：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.startArea" :options="startAreaList" @change="handleChangeAreaOption(1)"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>

      <!-- CTU 开始库位多选列表（出库时显示） -->
      <div class="taskList ctu-multi-select" v-if="vehicleType === 'ctu' && show.startLocationVisible">
        <div class="multi-select-header">
          <p class="expression" @click="openRowDropdown">开始库位：</p>
          <p class="select-count" :class="{ 'count-warn': ctuSelectedStartLocations.length >= CTU_MAX_LOCATIONS.value }">
            已选 {{ ctuSelectedStartLocations.length }}/{{ CTU_MAX_LOCATIONS }}
          </p>
        </div>
        <div class="multi-select-tags" v-if="ctuSelectedStartLocations.length > 0">
          <span
            v-for="loc in ctuSelectedStartLocations"
            :key="loc"
            class="sel-tag sel-tag--primary"
          >
            {{ loc }}
            <i class="sel-tag-close" @click="removeCtuStartLocation(loc)">×</i>
          </span>
        </div>
        <!-- 扫码输入框 -->
        <div class="scan-input-row">
          <van-search
            v-model="ctuScanStartInput"
            placeholder="扫码添加开始库位"
            class="searchSty scan-input"
            @keyup.enter="handleCtuScanStartEnter"
            @keydown.enter.prevent="handleCtuScanStartEnter"
          />
          <van-icon name="scan" class="scan" />
        </div>
        <div class="multi-select-list" v-if="startLocationList.length > 0">
          <div
            v-for="item in startLocationList"
            :key="item.value"
            class="location-item"
            :class="{
              'selected': ctuSelectedStartLocations.includes(item.value),
              'disabled': !ctuSelectedStartLocations.includes(item.value) && ctuSelectedStartLocations.length >= CTU_MAX_LOCATIONS.value
            }"
            @click="toggleCtuStartLocation(item.value)"
          >
            <span>{{ item.text }}</span>
            <van-icon name="success" v-if="ctuSelectedStartLocations.includes(item.value)" color="#1989fa"/>
          </div>
        </div>
        <p v-else class="no-location-tip">请先选择开始库区或直接扫码</p>
      </div>

      <!-- CTU 入库：开始库位固定只读 -->
      <div class="taskList" v-if="vehicleType === 'ctu' && taskType === 'ctu_in'">
        <div>
          <p class="expression" @click="openRowDropdown">开始库位：</p>
          <p class="fixed-location">{{ CTU_FIXED_LOCATION }}</p>
        </div>
      </div>

      <!-- CTU 目的库区（入库时显示） -->
      <div class="taskList" v-if="vehicleType === 'ctu' && show.endAreaVisible">
        <div>
          <p class="expression" @click="openRowDropdown">目的库区：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.endArea" :options="endAreaList" @change="handleChangeAreaOption(0)"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>

      <!-- CTU 目的库位多选列表（已停用，仅保留出库/入库） -->
      <div class="taskList ctu-multi-select" v-if="vehicleType === 'ctu' && show.endLocationVisible">
        <div class="multi-select-header">
          <p class="expression" @click="openRowDropdown">目的库位：</p>
          <p class="select-count" :class="{ 'count-warn': ctuSelectedEndLocations.length >= CTU_MAX_LOCATIONS.value }">
            已选 {{ ctuSelectedEndLocations.length }}/{{ CTU_MAX_LOCATIONS }}
          </p>
        </div>
        <div class="multi-select-tags" v-if="ctuSelectedEndLocations.length > 0">
          <span
            v-for="loc in ctuSelectedEndLocations"
            :key="loc"
            class="sel-tag sel-tag--success"
          >
            {{ loc }}
            <i class="sel-tag-close" @click="removeCtuEndLocation(loc)">×</i>
          </span>
        </div>
        <!-- 扫码输入框 -->
        <div class="scan-input-row">
          <van-search
            v-model="ctuScanEndInput"
            placeholder="扫码添加目的库位"
            class="searchSty scan-input"
            @keyup.enter="handleCtuScanEndEnter"
            @keydown.enter.prevent="handleCtuScanEndEnter"
          />
          <van-icon name="scan" class="scan"/>
        </div>
        <div class="multi-select-list" v-if="endLocationList.length > 0">
          <div
            v-for="item in endLocationList"
            :key="item.value"
            class="location-item"
            :class="{
              'selected': ctuSelectedEndLocations.includes(item.value),
              'disabled': !ctuSelectedEndLocations.includes(item.value) && ctuSelectedEndLocations.length >= CTU_MAX_LOCATIONS.value
            }"
            @click="toggleCtuEndLocation(item.value)"
          >
            <span>{{ item.text }}</span>
            <van-icon name="success" v-if="ctuSelectedEndLocations.includes(item.value)" color="#07c160"/>
          </div>
        </div>
        <p v-else class="no-location-tip">请先选择目的库区或直接扫码</p>
      </div>

      <!-- CTU 出库：目的库位固定只读 -->
      <div class="taskList" v-if="vehicleType === 'ctu' && taskType === 'ctu_out'">
        <div>
          <p class="expression" @click="openRowDropdown">目的库位：</p>
          <p class="fixed-location">{{ CTU_FIXED_LOCATION }}</p>
        </div>
      </div>

      <!-- ===== AGV 原有单选模式（非CTU时显示） ===== -->

      <!-- 开始库区：非CTU时显示 -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && show.startAreaVisible">
        <div>
          <p class="expression" @click="openRowDropdown">开始库区：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.startArea" :options="startAreaOptions || startAreaList" @change="handleChangeAreaOption(1)"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>
      <!-- AGV是否有货（旧点到点模式时显示，工序定义驱动时隐藏） -->
      <div class="taskList" v-if="vehicleType === 'agv' && taskType === 1 && !pickedDefCode">
        <div>
          <p class="expression" @click="openRowDropdown">查询是否有货：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.hasCargo" :options="hasCargoList" @change="handleChangeHasCargo"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>
      
      <!-- 开始库位下拉：非CTU 的旧流程（工序定义驱动改用下方多选/自动配对） -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && !pickedDefCode && show.startLocationVisible">
        <div>
          <p class="expression" @click="openRowDropdown">开始库位：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.startLocation" :options="startLocationList" :disabled="startFlag"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>

      <!-- 逆向时起点必须是"有货"库位；该库区当下若全空，候选为空只能扫码 -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && !pickedDefCode && reverseMode && data.startArea && startLocationList.length === 0">
        <p class="no-location-tip">该库区暂无可用的有货库位；若货物已在某库位，请直接扫码指定</p>
      </div>

      <!-- 开始库位扫描框：非CTU 的旧流程 -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && !pickedDefCode && show.startLocationVisible">
        <div>
          <p class="expression" @click="openRowDropdown">开始库位：</p>
          <p>
            <van-search
              ref="startLocationInput"
              v-model="data.startLocation"
              placeholder="请扫描开始库位"
              class="searchSty"
              @keyup.enter="handleStartLocationEnter"
              @keydown.enter.prevent="handleStartLocationEnter"
            />
          </p>
          <van-icon name="scan" class="scan" />
        </div>
      </div>

      <!-- AGV是否有货输入框（旧点到点模式时显示，工序定义驱动时隐藏） -->
      <div class="taskList" v-if="vehicleType === 'agv' && taskType === 1 && !pickedDefCode">
        <div>
          <p class="expression" @click="openRowDropdown">输入是否有货：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.hasCargoInput" :options="hasCargoList"/>
            </van-dropdown-menu>           
          </div>
        </div>
      </div>
      <!-- 终点库区：非CTU时显示 -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && show.endAreaVisible">
        <div>
          <p class="expression" @click="openRowDropdown">终点库区：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.endArea" :options="endAreaOptions || endAreaList" @change="handleChangeAreaOption(0)"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>

      <!-- 终点库位下拉：非CTU 的旧流程 -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && !pickedDefCode && show.endLocationVisible">
        <div>
          <p class="expression" @click="openRowDropdown">终点库位：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.endLocation" :options="endLocationList" :disabled="endFlag"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>

      <!-- 终点库位扫描框：非CTU 的旧流程 -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && !pickedDefCode && show.endLocationVisible">
        <div>
          <p class="expression" @click="openRowDropdown">终点库位：</p>
          <p>
            <van-search
              ref="endLocationInput"
              v-model="data.endLocation"
              placeholder="请扫描终点库位"
              class="searchSty"
              @keyup.enter="handleEndLocationEnter"
              @keydown.enter.prevent="handleEndLocationEnter"
            />
          </p>
          <van-icon name="scan" class="scan"/>
        </div>
      </div>

      <!-- ===== AGV 工序定义驱动：批量开关关闭时的手动多选库位 =====
           选 1 个 = 与原来一样下发 1 条；选多个 = 按选择顺序第 k 个配第 k 个批量下发。
           tag 上带序号，把"配对顺序"直接摆给操作员看。候选来自 lockDefAreas 已按「搬运顺序 + 角色」排好/过滤的列表。 -->
      <div class="taskList ctu-multi-select" v-if="vehicleType !== 'ctu' && pickedDefCode && !batchMode">
        <div class="multi-select-header">
          <p class="expression" @click="openRowDropdown">开始库位：</p>
          <p class="select-count">已选 {{ agvSelStartLocs.length }} 个</p>
        </div>
        <div class="multi-select-tags" v-if="agvSelStartLocs.length > 0">
          <span v-for="(loc, idx) in agvSelStartLocs" :key="loc" class="sel-tag sel-tag--primary">
            {{ idx + 1 }}. {{ loc }}
            <i class="sel-tag-close" @click="removeAgvSel('start', idx)">×</i>
          </span>
        </div>
        <div class="scan-input-row">
          <van-search
            v-model="agvScanStartInput"
            placeholder="扫码添加开始库位"
            class="searchSty scan-input"
            @keyup.enter="handleAgvScanStartEnter"
            @keydown.enter.prevent="handleAgvScanStartEnter"
          />
          <van-icon name="scan" class="scan" />
        </div>
        <div class="multi-select-list" v-if="startLocationList.length > 0">
          <div
            v-for="item in startLocationList"
            :key="item.value"
            class="location-item"
            :class="{ 'selected': agvSelStartLocs.includes(item.value) }"
            @click="toggleAgvSel('start', item.value)"
          >
            <span>{{ item.text }}</span>
            <van-icon name="success" v-if="agvSelStartLocs.includes(item.value)" color="#1989fa"/>
          </div>
        </div>
        <p v-else class="no-location-tip">{{ startListEmptyTip() }}</p>
      </div>

      <div class="taskList ctu-multi-select" v-if="vehicleType !== 'ctu' && pickedDefCode && !batchMode">
        <div class="multi-select-header">
          <p class="expression" @click="openRowDropdown">终点库位：</p>
          <p class="select-count">已选 {{ agvSelEndLocs.length }} 个</p>
        </div>
        <div class="multi-select-tags" v-if="agvSelEndLocs.length > 0">
          <span v-for="(loc, idx) in agvSelEndLocs" :key="loc" class="sel-tag sel-tag--success">
            {{ idx + 1 }}. {{ loc }}
            <i class="sel-tag-close" @click="removeAgvSel('end', idx)">×</i>
          </span>
        </div>
        <div class="scan-input-row">
          <van-search
            v-model="agvScanEndInput"
            placeholder="扫码添加终点库位"
            class="searchSty scan-input"
            @keyup.enter="handleAgvScanEndEnter"
            @keydown.enter.prevent="handleAgvScanEndEnter"
          />
          <van-icon name="scan" class="scan"/>
        </div>
        <div class="multi-select-list" v-if="endLocationList.length > 0">
          <div
            v-for="item in endLocationList"
            :key="item.value"
            class="location-item"
            :class="{ 'selected': agvSelEndLocs.includes(item.value) }"
            @click="toggleAgvSel('end', item.value)"
          >
            <span>{{ item.text }}</span>
            <van-icon name="success" v-if="agvSelEndLocs.includes(item.value)" color="#1989fa"/>
          </div>
        </div>
        <p v-else class="no-location-tip">该库区暂无可用的空闲终点库位</p>
      </div>

      <!-- 多选模式下起点/终点数量不一致时的提示（实际按较小的条数下发） -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && pickedDefCode && !batchMode && agvSelStartLocs.length !== agvSelEndLocs.length">
        <p class="no-location-tip">
          起点 {{ agvSelStartLocs.length }} 个、终点 {{ agvSelEndLocs.length }} 个，数量不一致，将按较小的
          {{ Math.min(agvSelStartLocs.length, agvSelEndLocs.length) }} 条下发
        </p>
      </div>

      <!-- 烤房温度（终点为烤房位 KF<n> 时展示；超温/读取失败则禁发） -->
      <div class="taskList" v-if="vehicleType !== 'ctu' && (furnaceInfo || furnaceLoading)">
        <div>
          <p class="expression" @click="openRowDropdown">烤房温度：</p>
          <p :style="{ color: furnaceBlocked ? '#ee0a24' : '#07c160' }">
            <template v-if="furnaceLoading && !furnaceInfo">查询中…</template>
            <template v-else-if="furnaceInfo && furnaceInfo.state === 'OVER'">
              <span style="font-weight: 600">超限：{{ furnaceInfo.temperature }}℃（阈值 {{ furnaceInfo.threshold }}℃）</span>
            </template>
            <template v-else-if="furnaceInfo && furnaceInfo.state === 'UNREACHABLE'">
              <span style="font-weight: 600">{{ furnaceInfo.message || '烤房温度读取异常，禁止下发' }}</span>
            </template>
            <template v-else-if="furnaceInfo">
              {{ furnaceInfo.temperature }}℃（阈值 {{ furnaceInfo.threshold }}℃）
            </template>
          </p>
        </div>
      </div>

      <!-- CTU入库：料箱编码多条扫码列表 -->
      <div class="taskList ctu-multi-select" v-if="show.boxCodeVisible">
        <div class="multi-select-header">
          <p class="expression" @click="openRowDropdown">料箱编码：</p>
          <p class="select-count" :class="{ 'count-warn': ctuBoxCodes.length >= CTU_MAX_LOCATIONS.value }">
            已扫 {{ ctuBoxCodes.length }}/{{ CTU_MAX_LOCATIONS }}
            <span v-if="taskType === 'ctu_in' && ctuSelectedEndLocations.length > 0"
                  :style="{ color: ctuBoxCodes.length === ctuSelectedEndLocations.length ? '#07c160' : '#ee0a24', marginLeft: '0.06rem' }">
              (需{{ ctuSelectedEndLocations.length }}个)
            </span>
          </p>
        </div>
        <div class="multi-select-tags" v-if="ctuBoxCodes.length > 0">
          <span
            v-for="(bc, idx) in ctuBoxCodes"
            :key="bc"
            class="sel-tag sel-tag--warning"
          >
            {{ bc }}
            <i class="sel-tag-close" @click="removeCtuBoxCode(bc)">×</i>
          </span>
        </div>
        <div class="scan-input-row">
          <van-search
            v-model="ctuScanBoxInput"
            placeholder="请扫描料箱二维码"
            class="searchSty scan-input"
            @keyup.enter="handleCtuScanBoxEnter"
            @keydown.enter.prevent="handleCtuScanBoxEnter"
          />
          <van-icon name="scan" class="scan"/>
        </div>
      </div>

      <!-- CTU：产品信息扫码（从二维码解析产品编码和批号） -->
      <div class="taskList ctu-multi-select" v-if="vehicleType === 'ctu' && (show.boxCodeVisible || show.productCodeVisible)">
        <div class="multi-select-header">
          <p class="expression" @click="openRowDropdown">产品编码：</p>
          <p class="select-count" :class="{ 'count-warn': ctuProductCodes.length >= CTU_MAX_LOCATIONS.value }">
            已扫 {{ ctuProductCodes.length }}/{{ CTU_MAX_LOCATIONS }}
          </p>
        </div>
        <div class="multi-select-tags" v-if="ctuProductCodes.length > 0">
          <span
            v-for="(pc, idx) in ctuProductCodes"
            :key="pc + idx"
            class="sel-tag sel-tag--primary"
          >
            {{ pc }}
            <i class="sel-tag-close" @click="removeCtuProductCode(idx)">×</i>
          </span>
        </div>
        <div class="scan-input-row">
          <van-search
            v-model="ctuScanProductInput"
            placeholder="请扫描产品二维码"
            class="searchSty scan-input"
            @keyup.enter="handleCtuScanProductEnter"
            @keydown.enter.prevent="handleCtuScanProductEnter"
          />
          <van-icon name="scan" class="scan"/>
        </div>
      </div>

      <!-- CTU：产品批号（只读，从扫码自动解析，与产品编码一一对应，tag列表展示） -->
      <div class="taskList ctu-multi-select" v-if="vehicleType === 'ctu' && (show.boxCodeVisible || show.productCodeVisible) && ctuProductLots.length > 0">
        <div class="multi-select-header">
          <p class="expression" @click="openRowDropdown">产品批号：</p>
          <p class="select-count">
            共 {{ ctuProductLots.length }} 条
          </p>
        </div>
        <div class="multi-select-tags">
          <span
            v-for="(lot, idx) in ctuProductLots"
            :key="idx"
            class="sel-tag sel-tag--success"
          >
            {{ lot }}
          </span>
        </div>
      </div>
      <!-- 无数据时显示占位框 -->
      <div class="taskList" v-if="vehicleType === 'ctu' && (show.boxCodeVisible || show.productCodeVisible) && ctuProductLots.length === 0">
        <div>
          <p class="expression" @click="openRowDropdown">产品批号：</p>
          <p>
            <van-field
              value=""
              readonly
              placeholder="扫描产品二维码后自动填入"
              class="searchSty"
            />
          </p>
        </div>
      </div>

      <!-- AGV产品编码扫码（从二维码解析产品编码和批号） -->
      <div class="taskList ctu-multi-select" v-if="vehicleType === 'agv' && show.productCodeVisible">
        <div class="multi-select-header">
          <p class="expression" @click="openRowDropdown">产品编码：</p>
          <p class="select-count">
            已扫 {{ agvProductCodes.length }} 条
          </p>
        </div>
        <div class="multi-select-tags" v-if="agvProductCodes.length > 0">
          <span
            v-for="(pc, idx) in agvProductCodes"
            :key="pc + idx"
            class="sel-tag sel-tag--primary"
          >
            {{ pc }}
            <i class="sel-tag-close" @click="removeAgvProductCode(idx)">×</i>
          </span>
        </div>
        <div class="scan-input-row">
          <van-search
            v-model="agvScanProductInput"
            placeholder="请扫描产品二维码"
            class="searchSty scan-input"
            @keyup.enter="handleAgvScanProductEnter"
            @keydown.enter.prevent="handleAgvScanProductEnter"
          />
          <van-icon name="scan" class="scan"/>
        </div>
      </div>

      <!-- AGV产品批号（只读，从扫码自动解析，与产品编码一一对应，tag列表展示） -->
      <div class="taskList ctu-multi-select" v-if="vehicleType === 'agv' && show.productCodeVisible && agvProductLots.length > 0">
        <div class="multi-select-header">
          <p class="expression" @click="openRowDropdown">产品批号：</p>
          <p class="select-count">
            共 {{ agvProductLots.length }} 条
          </p>
        </div>
        <div class="multi-select-tags">
          <span
            v-for="(lot, idx) in agvProductLots"
            :key="idx"
            class="sel-tag sel-tag--success"
          >
            {{ lot }}
          </span>
        </div>
      </div>
      <!-- AGV无产品编码时显示占位框 -->
      <div class="taskList" v-if="vehicleType === 'agv' && show.productCodeVisible && agvProductLots.length === 0">
        <div>
          <p class="expression" @click="openRowDropdown">产品批号：</p>
          <p>
            <van-field
              value=""
              readonly
              placeholder="扫描产品二维码后自动填入"
              class="searchSty"
            />
          </p>
        </div>
      </div>

      <!-- AGV：物料编码扫描框 -->
      <div class="taskList" v-if="show.materialScanVisible">
        <div>
          <p class="expression" @click="openRowDropdown">物料编码：</p>
          <p>
            <van-search v-model="data.materialCode" placeholder="请扫描物料码" class="searchSty"/>
          </p>
          <van-icon name="scan" class="scan"/>
        </div>
      </div>

      <!-- AGV：物料编码下拉 -->
      <div class="taskList" v-if="show.materialVisible">
        <div>
          <p class="expression" @click="openRowDropdown">物料编码：</p>
          <div class="dd-wrap">
            <van-dropdown-menu>
              <van-dropdown-item v-model="data.materialCode" :options="materialList"/>
            </van-dropdown-menu>
          </div>
        </div>
      </div>

      <!-- 发起订单按钮 -->
      <div>
        <div class="taskList" style="border: 0">
          <div>
            <p>
              <van-button type="info" :disabled="buttonDisabled" @click="SubmitOrder()">
                发起订单
              </van-button>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 扫码摄像头 -->
    <div v-show="loadingShow">
      <div class="video-show"/>
      <video ref="videoElement" style="width: 100%;height: 100%" autoplay playsinline/>
    </div>
  </div>
</template>
<script setup>
import { AreaInfo, LocationInfo, LocationOrderedList, MaterialOptions, orderNew, getOne, ctuInAvailableCount, boxQuery, pdaTaskMenu, rcsTaskChains, getFurnaceStatus } from '@/api'
import { Dialog, Toast } from 'vant'
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { BrowserMultiFormatReader } from '@zxing/library'

// 包装为与原懒加载接口兼容的函数，直接返回已同步加载的类
const loadZxing = async () => BrowserMultiFormatReader

const code = ref('') // orderCode：工序定义驱动后由所选定义编码赋值（不再硬编码 ZTEV1_*）
let allLocationList = ref([]) // 所有库位
let startAreaList = ref([]) // 起始库区（根据vehicleType动态切换CTU/AGV）
let startLocationList = ref([]) // 起始库位
let endAreaList = ref([]) // 终点库区（根据vehicleType动态切换CTU/AGV）
let endLocationList = ref([]) // 终点库位
let vehicleType = ref('agv') // 车辆类型，默认AGV叉车机器人
const vehicleTypeList = ref([ // 车辆类型选择
  {
    text: 'AGV叉车机器人',
    value: 'agv'
  }
])
let taskType = ref(1) // 任务类型
const taskTypeList = ref([ // 任务类型选择（AGV默认）
  {
    text: '点到点',
    value: 1
  },
  {
    text: '点到区域',
    value: 2
  },
  {
    text: '区域到区域',
    value: 3
  },
  {
    text: '区域到点',
    value: 4
  },
])

// CTU专用任务类型
const ctuTaskTypeList = ref([
  { text: '出库', value: 'ctu_out' },
  { text: '入库', value: 'ctu_in' },
])

// AGV托盘类型
const palletTypeList = ref([
  { text: '料箱托', value: '0001' },
  { text: '推车托', value: '0002' },
])

// AGV是否有货
const hasCargoList = ref([
  { text: '空货', value: '0' },
  { text: '有货', value: '1' },
  { text: '无货', value: '2' },
])

// CTU固定库位
const CTU_FIXED_LOCATION = 'R50A01011'

// CTU 多选相关
const CTU_MAX_LOCATIONS = ref(6)          // 动态最大数量（ctu_in 时根据库区空闲库位数调整）
const ctuSelectedStartLocations = ref([]) // CTU 已选开始库位列表
const ctuSelectedEndLocations = ref([])   // CTU 已选目的库位列表
const ctuBoxCodes = ref([])               // CTU 入库料箱编码列表
const ctuScanStartInput = ref('')         // CTU 开始库位扫码输入
const ctuScanEndInput = ref('')           // CTU 目的库位扫码输入
const ctuScanBoxInput = ref('')           // CTU 料箱编码扫码输入
const hasCargoInput = ref('')             // AGV 是否有货输入框
const ctuProductCodes = ref([])           // CTU 入库产品编码列表（从二维码解析 DM 字段）
const ctuProductLots = ref([])            // CTU 入库产品批号列表（与产品编码一一对应，从二维码解析 LOT 字段，允许重复）
const ctuScanProductInput = ref('')       // CTU 产品二维码扫码输入

// AGV 产品编码相关（与 CTU 入库类似）
const agvProductCodes = ref([])            // AGV 产品编码列表
const agvProductLots = ref([])            // AGV 产品批号列表（与产品编码一一对应）
const agvScanProductInput = ref('')       // AGV 产品二维码扫码输入

// 切换 CTU 开始库位选中状态
const toggleCtuStartLocation = (locationCode) => {
  const idx = ctuSelectedStartLocations.value.indexOf(locationCode)
  if (idx >= 0) {
    // 取消选中
    ctuSelectedStartLocations.value.splice(idx, 1)
    // 若全部取消，同步清空开始库区（允许重新选其他库区）
    if (ctuSelectedStartLocations.value.length === 0) {
      data.value.startArea = null
    }
  } else {
    if (ctuSelectedStartLocations.value.length >= CTU_MAX_LOCATIONS.value) {
      Dialog.alert({ message: `最多只能选择 ${CTU_MAX_LOCATIONS.value} 个开始库位` })
      return
    }
    // 查找该库位所属库区
    const loc = allLocationList.value.find(item => item.code === locationCode)
    const area = loc ? startAreaList.value.find(a => a.id === loc.areaId) : null
    if (ctuSelectedStartLocations.value.length === 0) {
      // 第一个库位：自动带出对应库区
      if (area) data.value.startArea = area.value
    } else {
      // 后续库位：必须与第一个库位同一库区（同父库区下的不同子库区也算同一区）
      if (area && data.value.startArea && !sameAreaGroupByCode(area.value, data.value.startArea)) {
        const startAreaItem = startAreaList.value.find(a => a.value === data.value.startArea)
        const firstAreaName = (startAreaItem && startAreaItem.text) || data.value.startArea
        Dialog.alert({ message: `库位 ${locationCode} 所属库区【${area.text}】与已选库区【${firstAreaName}】不一致，只能选同一库区下的库位` })
        return
      }
    }
    ctuSelectedStartLocations.value.push(locationCode)
  }
}

// 移除 CTU 开始库位
const removeCtuStartLocation = (locationCode) => {
  const idx = ctuSelectedStartLocations.value.indexOf(locationCode)
  if (idx >= 0) ctuSelectedStartLocations.value.splice(idx, 1)
}

// 切换 CTU 目的库位选中状态
const toggleCtuEndLocation = (locationCode) => {
  const idx = ctuSelectedEndLocations.value.indexOf(locationCode)
  if (idx >= 0) {
    ctuSelectedEndLocations.value.splice(idx, 1)
  } else {
    if (ctuSelectedEndLocations.value.length >= CTU_MAX_LOCATIONS.value) {
      Dialog.alert({ message: `最多只能选择 ${CTU_MAX_LOCATIONS.value} 个目的库位` })
      return
    }
    ctuSelectedEndLocations.value.push(locationCode)
  }
}

// 移除 CTU 目的库位
const removeCtuEndLocation = (locationCode) => {
  const idx = ctuSelectedEndLocations.value.indexOf(locationCode)
  if (idx >= 0) ctuSelectedEndLocations.value.splice(idx, 1)
}

// 扫码添加 CTU 开始库位（扫码输入框回车）
const handleCtuScanStartEnter = () => {
  const val = ctuScanStartInput.value.trim()
  if (!val) return
  // 校验库位是否存在且有货
  const loc = allLocationList.value.find(item => item.code === val)
  if (!loc) {
    Dialog.alert({ message: `库位 ${val} 不存在` })
    ctuScanStartInput.value = ''
    return
  }
  // 校验库位必须属于CTU库区（后端已过滤好的 startAreaList 即为CTU库区）
  const area = startAreaList.value.find(a => a.id === loc.areaId)
  if (!area) {
    Dialog.alert({ message: `库位 ${val} 不属于CTU库区，请扫描CTU库区下的库位` })
    ctuScanStartInput.value = ''
    return
  }
  if (loc.status !== 2) {
    Dialog.alert({ message: `库位 ${val} 无货，不能作为开始库位` })
    ctuScanStartInput.value = ''
    return
  }
  if (ctuSelectedStartLocations.value.includes(val)) {
    Dialog.alert({ message: `库位 ${val} 已添加` })
    ctuScanStartInput.value = ''
    return
  }
  if (ctuSelectedStartLocations.value.length >= CTU_MAX_LOCATIONS.value) {
    Dialog.alert({ message: `最多只能选择 ${CTU_MAX_LOCATIONS.value} 个开始库位` })
    ctuScanStartInput.value = ''
    return
  }

  // 第一个库位：自动带出对应的开始库区
  if (ctuSelectedStartLocations.value.length === 0) {
    data.value.startArea = area.value
  } else {
    // 后续库位：必须与第一个库位属于同一库区（同父库区下的不同子库区也算同一区）
    if (data.value.startArea && !sameAreaGroupByCode(area.value, data.value.startArea)) {
      const startAreaItem = startAreaList.value.find(a => a.value === data.value.startArea)
      const firstAreaName = (startAreaItem && startAreaItem.text) || data.value.startArea
      Dialog.alert({ message: `库位 ${val} 所属库区【${area.text}】与已选库区【${firstAreaName}】不一致，只能选同一库区下的库位` })
      ctuScanStartInput.value = ''
      return
    }
  }

  ctuSelectedStartLocations.value.push(val)
  ctuScanStartInput.value = ''
}

// 扫码添加 CTU 目的库位（扫码输入框回车）
const handleCtuScanEndEnter = () => {
  const val = ctuScanEndInput.value.trim()
  if (!val) return
  // 校验库位是否存在且空闲
  const loc = allLocationList.value.find(item => item.code === val)
  if (!loc) {
    Dialog.alert({ message: `库位 ${val} 不存在` })
    ctuScanEndInput.value = ''
    return
  }
  // 校验库位必须属于CTU库区（后端已过滤好的 endAreaList 即为CTU库区）
  const area = endAreaList.value.find(a => a.id === loc.areaId)
  if (!area) {
    Dialog.alert({ message: `库位 ${val} 不属于CTU库区，请扫描CTU库区下的库位` })
    ctuScanEndInput.value = ''
    return
  }
  if (loc.status !== 1) {
    Dialog.alert({ message: `库位 ${val} 非空闲，不能作为目的库位` })
    ctuScanEndInput.value = ''
    return
  }
  if (ctuSelectedEndLocations.value.includes(val)) {
    Dialog.alert({ message: `库位 ${val} 已添加` })
    ctuScanEndInput.value = ''
    return
  }
  if (ctuSelectedEndLocations.value.length >= CTU_MAX_LOCATIONS.value) {
    Dialog.alert({ message: `最多只能选择 ${CTU_MAX_LOCATIONS.value} 个目的库位` })
    ctuScanEndInput.value = ''
    return
  }
  ctuSelectedEndLocations.value.push(val)
  ctuScanEndInput.value = ''
}

// 扫码添加料箱编码
// 格式要求：HB 前缀 + 6位数字，如 HB200001
const BOX_CODE_REGEX = /^HB\d{6}$/

const handleCtuScanBoxEnter = () => {
  const val = ctuScanBoxInput.value.trim()
  if (!val) return
  // 格式校验：必须为 HB + 6位数字
  if (!BOX_CODE_REGEX.test(val)) {
    Toast({ message: `料箱编码格式错误：${val}\n格式应为 HB + 6位数字，如 HB200001`, duration: 2500 })
    ctuScanBoxInput.value = ''
    return
  }
  if (ctuBoxCodes.value.includes(val)) {
    Dialog.alert({ message: `料箱编码 ${val} 已添加` })
    ctuScanBoxInput.value = ''
    return
  }
  if (ctuBoxCodes.value.length >= CTU_MAX_LOCATIONS.value) {
    Dialog.alert({ message: `最多只能添加 ${CTU_MAX_LOCATIONS.value} 个料箱编码` })
    ctuScanBoxInput.value = ''
    return
  }
  ctuBoxCodes.value.push(val)
  ctuScanBoxInput.value = ''
}

// 移除料箱编码
const removeCtuBoxCode = (code) => {
  const idx = ctuBoxCodes.value.indexOf(code)
  if (idx >= 0) ctuBoxCodes.value.splice(idx, 1)
}

/**
 * 产品二维码解析
 *
 * 二维码格式示例：
 *   <LOT:TE39YEW9260601H ><WS:----------><DM:BTE39HMS9><WGT: 33.330><ID:151260601130533><NO:03><FR:03>
 *
 * 解析规则：
 *   LOT: 后面到 > 之间的内容（去除末尾空格）= 产品批号
 *   DM:  后面到 > 之间的内容 = 产品编码
 *
 * @param {string} raw 原始扫码字符串
 * @returns {{ lot: string, dm: string } | null}
 */
const parseProductQrCode = (raw) => {
  if (!raw) return null
  const lotMatch = raw.match(/<LOT:([^>]+)>/)
  const dmMatch  = raw.match(/<DM:([^>]+)>/)
  if (!dmMatch) return null
  return {
    lot: lotMatch ? lotMatch[1].trim() : '',
    dm:  dmMatch[1].trim()
  }
}

// 扫描产品二维码，解析产品编码（DM）和批号（LOT）
// CTU出库时：调用 /box/query 接口获取库位信息，自动填充开始库位
// 支持两种输入方式：
// 1. 扫描产品二维码（格式：<DM:产品编码><LOT:批号>）
// 2. 手动输入产品编码（纯文本）
const handleCtuScanProductEnter = async () => {
  const raw = ctuScanProductInput.value.trim()
  if (!raw) return

  let dm = ''
  let lot = ''

  // 尝试解析二维码格式
  const parsed = parseProductQrCode(raw)
  if (parsed) {
    // 扫码输入：使用解析出的产品编码和批号
    dm = parsed.dm
    lot = parsed.lot
  } else {
    // 手动输入：将输入内容作为产品编码，批号为空
    dm = raw
    lot = ''
  }

  // 数量上限检查
  if (ctuProductCodes.value.length >= CTU_MAX_LOCATIONS.value) {
    Dialog.alert({ message: `最多只能添加 ${CTU_MAX_LOCATIONS.value} 个产品编码` })
    ctuScanProductInput.value = ''
    return
  }

  // CTU出库：调用 /box/query 接口获取库位信息
  if (taskType.value === 'ctu_out') {
    try {
      console.log('CTU出库：调用 /box/query 接口，参数：', { productCode: dm, productLot: lot, pageNo: 0, pageSize: 6 })
      const result = await boxQuery({
        productCode: dm,
        productLot: lot,
        pageNo: 0,
        pageSize: 6
      })
      console.log('CTU出库：/box/query 接口响应：', result)

      if (result.result === 0 && result.data && result.data.data && result.data.data.list) {
        const boxList = result.data.data.list
        console.log('CTU出库：boxList 数据：', boxList)
        // alert('boxList: ' + JSON.stringify(boxList))

        if (boxList.length === 0) {
          Toast({ message: `未找到产品编码 ${dm} 对应的料箱信息`, duration: 2500 })
          ctuScanProductInput.value = ''
          return
        }

        // 用于记录已添加的产品编码+产品批号组合
        const productSeen = new Set()
        // 用于记录每个产品组下第一个库位的库区（同一产品组内不同库区只显示一条库位）
        const productFirstAreaMap = new Map()

        // 遍历所有查询结果
        for (const box of boxList) {
          const locationCode = box.boxLocationCode  // 改为 boxLocationCode
          const areaId = box.areaId
          const areaName = box.areaName
          const productCode = box.productCode || dm  // 使用接口返回的产品编码，若无则使用用户输入
          const productLot = box.productLot || lot   // 使用接口返回的产品批号，若无则使用用户输入
          console.log('CTU出库：处理单个 box：', { locationCode, areaId, areaName, productCode, productLot })
          // alert('locationCode: ' + locationCode + ', areaId: ' + areaId + ', areaName: ' + areaName + ', productCode: ' + productCode + ', productLot: ' + productLot)

          // 校验库位是否已添加
          if (ctuSelectedStartLocations.value.includes(locationCode)) {
            console.log('CTU出库：库位已存在，跳过：', locationCode)
            continue // 跳过已添加的库位
          }

          // 校验数量上限
          if (ctuSelectedStartLocations.value.length >= CTU_MAX_LOCATIONS.value) {
            Dialog.alert({ message: `最多只能选择 ${CTU_MAX_LOCATIONS.value} 个开始库位` })
            break
          }

          const productKey = productCode + '_' + productLot

          // 获取该产品组下第一个库位的库区
          const firstAreaId = productFirstAreaMap.get(productKey)

          // 逻辑：
          // - 如果还没有第一个库区（第一次处理该产品组），记录当前库区
          // - 如果已有第一个库区，检查当前库区是否相同
          //   - 相同库区：允许添加多条库位
          //   - 不同库区：跳过（只显示一条库位）
          if (firstAreaId === undefined) {
            // 第一次处理该产品组，记录当前库区
            productFirstAreaMap.set(productKey, areaId)
          } else if (firstAreaId !== areaId) {
            // 不同库区，跳过（只显示一条库位）
            console.log('CTU出库：不同库区，跳过：', locationCode, 'firstAreaId:', firstAreaId, 'currentAreaId:', areaId)
            continue
          }

          // 添加库位到开始库位列表
          ctuSelectedStartLocations.value.push(locationCode)
          console.log('CTU出库：已添加库位到列表，当前列表：', ctuSelectedStartLocations.value)
        //  alert('已添加库位，当前列表长度：' + ctuSelectedStartLocations.value.length + ', 列表内容：' + JSON.stringify(ctuSelectedStartLocations.value))

          // 产品编码和批号：同组只添加第一条（按产品编码+产品批号组合去重）
          if (!productSeen.has(productKey)) {
            ctuProductCodes.value.push(productCode)
            ctuProductLots.value.push(productLot)
            productSeen.add(productKey)
          }

          // 第一个库位：直接使用 areaId 和 areaName 设置库区下拉框
          if (ctuSelectedStartLocations.value.length === 1) {
            if (areaId && areaName) {
              // 检查 startAreaList 中是否已存在该库区
              let areaOption = startAreaList.value.find(a => a.value === areaId)
              if (!areaOption) {
                // 如果不存在，添加新的库区选项
                areaOption = { text: areaName, value: areaId, id: areaId }
                startAreaList.value.push(areaOption)
              }
              // 设置开始库区
              data.value.startArea = areaId
              console.log('CTU出库：设置开始库区，areaId: ' + areaId + ', areaName: ' + areaName)
            //  alert('设置开始库区成功，areaId: ' + areaId + ', areaName: ' + areaName + ', data.startArea: ' + data.value.startArea)
            } else {
              console.log('CTU出库：接口返回的 areaId 或 areaName 为空')
            //  alert('接口返回的 areaId 或 areaName 为空，areaId: ' + areaId + ', areaName: ' + areaName)
            }
          }
        }

        console.log('CTU出库：最终库位列表：', ctuSelectedStartLocations.value)
     //   alert('最终库位列表：' + JSON.stringify(ctuSelectedStartLocations.value))
        Toast({ message: `已添加 ${ctuSelectedStartLocations.value.length} 个库位`, duration: 1500 })
      } else {
        console.log('CTU出库：接口响应格式不匹配或失败，result：', result)
        Toast({ message: result.message || '查询料箱信息失败', duration: 2500 })
      }
    } catch (e) {
      console.log('CTU出库：接口调用异常：', e)
      Toast({ message: '查询料箱信息异常', duration: 2500 })
    }

    ctuScanProductInput.value = ''
    return
  }

  // CTU入库：校验产品编码是否包含HB字样
  if (taskType.value === 'ctu_in') {
    if (dm.toUpperCase().includes('HB')) {
      Toast({ message: '产品编码包含HB字样，已清空所有产品编码数据', duration: 2500 })
      // 清空所有已添加的产品编码和批号数据
      ctuProductCodes.value = []
      ctuProductLots.value = []
      ctuScanProductInput.value = ''
      return
    }
  }

  // CTU入库或AGV：直接添加产品编码和批号
  ctuProductCodes.value.push(dm)
  ctuProductLots.value.push(lot)

  ctuScanProductInput.value = ''
}

// 移除产品编码（按索引，同步移除对应批号）
const removeCtuProductCode = (idx) => {
  ctuProductCodes.value.splice(idx, 1)
  ctuProductLots.value.splice(idx, 1)
}

// AGV 扫描产品二维码，解析产品编码（DM）和批号（LOT）
const handleAgvScanProductEnter = () => {
  const raw = agvScanProductInput.value.trim()
  if (!raw) return

  const parsed = parseProductQrCode(raw)
  if (!parsed) {
    Toast({ message: '二维码格式错误，未找到产品编码（DM字段）', duration: 2500 })
    agvScanProductInput.value = ''
    return
  }

  const { lot, dm } = parsed

  // 产品编码和批号一一对应地加入列表（批号允许重复）
  agvProductCodes.value.push(dm)
  agvProductLots.value.push(lot)

  agvScanProductInput.value = ''
}

// AGV 移除产品编码（按索引，同步移除对应批号）
const removeAgvProductCode = (idx) => {
  agvProductCodes.value.splice(idx, 1)
  agvProductLots.value.splice(idx, 1)
}

let buttonDisabled = ref(false)
let data = ref({
  startArea: null,
  startLocation: null,
  endArea: null,
  endLocation: null,
  palletType: null, // AGV托盘类型：0001料箱托，0002推车托
  hasCargo: null, // AGV是否有货：1有货，2无货
  // materialCode: null,
  boxCode: null  // CTU入库时的料箱编码
})
let endFlag = ref(true) // 开关
let startFlag = ref(true)
let materialList = ref([]) // 物料列表
let codeReader = null // 这个就是从@zxing/library导出来的方法，new一个实例
let loadingShow = ref(false) // 扫码显示隐藏

let show = ref({ // 显示
  startAreaVisible: true,
  startLocationVisible: true,
  startLocationScanVisible: false,
  endAreaVisible: true,
  endLocationVisible: true,
  endLocationScanVisible: false,
  materialScanVisible: false,
  materialVisible: false,
  boxCodeVisible: false,  // CTU入库时的料箱编码扫描框
  palletTypeVisible: true, // AGV托盘类型
  productCodeVisible: false // AGV产品编码
})
let spotSendSpotVisible = ref({ // 点到点
  startAreaVisible: true,
  startLocationVisible: true,
  endAreaVisible: true,
  endLocationVisible: true,
  palletTypeVisible: true,
  productCodeVisible: true
})
let spotSendAreaVisible = ref({ // 点到区域：只需开始库区、开始库位、终点库区；终点库位由后端自动分配
  startAreaVisible: true,
  startLocationVisible: true,
  endAreaVisible: true,
  endLocationVisible: false,  // 隐藏终点库位，后端自动从目的库区中分配空闲库位
  materialScanVisible: false,
  materialVisible: false,
  palletTypeVisible: true,
  productCodeVisible: true
})

let materialSendSpot = ref({ // 区域到点
  startAreaVisible: true,
  endAreaVisible: true,
  endLocationScanVisible: true,
  materialVisible: true,
  palletTypeVisible: true,
  productCodeVisible: true
})

let stream = null // 摄像头视频流
const videoElement = ref(null) // 绑定到 <video> 元素
const startLocationInput = ref(null) // 开始库位输入框引用
const endLocationInput = ref(null) // 终点库位输入框引用

const temporaryArea = ref(['MT-ELE', 'MT-MTS']) // 暂存区这里加

// ===== 工序定义驱动（Stage④：菜单来自后端启用定义，orderCode=定义编码） =====
const pickedDefCode = ref('')
const pickedDef = ref(null)
const definitionList = ref([])
const definitionDisabled = ref(true)
const startAreaLocked = ref(false)
const endAreaLocked = ref(false)
const defConfigInvalid = ref(true) // 所选工序未配置起点/终点库区（且能在当前库区列表解析到）时为 true，禁止下发
const defMap = ref({})

// ===== 任务类型（RCS 任务链）=====
// 选项来自 WCS 的 wcs_rcs_task_chain（由 RCS agv_ds_task_chain_template 同步），
// 选中值随订单作为 taskChainCode 下发，最终成为 RCS /task/create 的 taskChainNum。
// 不选则由后端兜底默认链，故此处不做必填校验。
const pickedTaskChain = ref('')
const taskChainList = ref([])

// 逆向搬运：打开后当前工序的起点/终点库区对调，工序(orderCode)、任务类型(链)都不变，
// 仍用同一个「发起订单」下发。方向统一由 lockDefAreas 施加，这里只存开关状态。
const reverseMode = ref(false)

// ===== 批量任务下发（工序定义驱动的 AGV 专用）=====
// 打开：不选库位，按「搬运顺序」把 起点(有货)/终点(空闲) 一对一配对后批量下发。
// 关闭：库位改多选，按选择顺序第 k 个配第 k 个；一个都不选则保持原样（起终点留空、后端自动分配 1 条）。
// 关键约束：后端 /order/new 的 taskCount 只会在**同一个库位**上复制多实例（TaskDispatch 循环复用同一
// orderVo，自动分配每次返回同一库位），所以批量必须是 N 次独立调用，每次显式带 startLocation/endLocation。
const batchMode = ref(false)
const agvSelStartLocs = ref([])    // 手动多选的开始库位码，**按点选先后顺序**
const agvSelEndLocs = ref([])      // 手动多选的终点库位码，**按点选先后顺序**
const agvScanStartInput = ref('')
const agvScanEndInput = ref('')
const batchPairs = ref([])         // 自动模式试算好的配对 [{start,end}]
const batchPlanTotal = ref(0)      // 最大可配对数 = min(可用起点, 可用终点)
const batchCount = ref(0)          // 本次条数（默认全搬，可下调）
const batchCountInput = ref('')    // 条数输入框（字符串，失焦时夹取）
const batchProgress = ref('')      // 逐条串行的进度文案（分钟级，必须让操作员看得到）

const resetAgvSel = () => {
  agvSelStartLocs.value = []
  agvSelEndLocs.value = []
  agvScanStartInput.value = ''
  agvScanEndInput.value = ''
  batchProgress.value = ''
}

// ===== 「已下发的起/终点」本地记忆：下一批自动跳到没发过的库位 =====
// 后端只有一个 60s 的目的地 Redis 锁，且库位状态要到 RCS 回调（车到达）才翻转——
// 下单成功后到车到达前，起点仍显示有货、终点仍显示空闲。所以"刚发过什么"必须由 PDA 自己记，
// 否则第二批会把同一批库位再挑一遍（终点还会被锁挡回 -1）。用 localStorage 是为了刷新页面也不丢。
const DISPATCH_MEMO_KEY = 'pda_dispatched_locs'
const DISPATCH_MEMO_TTL_MS = 10 * 60 * 1000

const readDispatched = () => {
  try {
    const obj = JSON.parse(localStorage.getItem(DISPATCH_MEMO_KEY) || '{}')
    const now = Date.now()
    const alive = {}
    Object.keys(obj).forEach(k => { if (Number(obj[k]) > now) alive[k] = obj[k] })
    return alive
  } catch (e) {
    return {}
  }
}
const writeDispatched = (obj) => {
  try { localStorage.setItem(DISPATCH_MEMO_KEY, JSON.stringify(obj)) } catch (e) {}
}
// 读并顺手清过期，避免无限增长
const skipDispatched = (codes) => {
  const memo = readDispatched()
  writeDispatched(memo)
  return codes.filter(c => !(c in memo))
}
const markDispatched = (pairs) => {
  const memo = readDispatched()
  const exp = Date.now() + DISPATCH_MEMO_TTL_MS
  pairs.forEach(p => { if (p.start) memo[p.start] = exp; if (p.end) memo[p.end] = exp })
  writeDispatched(memo)
}
// 失败的没真正占位，撤回，下次还能用
const rollbackDispatched = (pairs) => {
  const memo = readDispatched()
  pairs.forEach(p => { delete memo[p.start]; delete memo[p.end] })
  writeDispatched(memo)
}

// 链的每点角色（后端 stationRoles，P取货/D送货/K停靠/C盘点）：
// stationNum=2 → 起点取第 1 个角色、终点取第 2 个；=1 → 只下发终点，只取第 1 个角色。
// 取不到角色（老数据/未同步）返回 null → 前端不过滤、后端不拦（与改动前一致）。
const chainPointRoles = () => {
  const item = taskChainList.value.find(o => o.value === pickedTaskChain.value)
  const roles = item && item.stationRoles
    ? String(item.stationRoles).split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : []
  if (!roles.length) return { startRole: null, endRole: null }
  const twoPoints = roles.length >= 2
  return { startRole: twoPoints ? roles[0] : null, endRole: twoPoints ? roles[1] : roles[0] }
}

// 起终点**实际生效**的角色（含兜底）。lockDefAreas 与批量配对共用同一份口径，
// 保证「自动配对挑出来的库位」与「操作员照单选列表挑的」完全一致。
// 角色取不到（未选链/老数据）时：终点本来就按空闲收窄（等价 D）；起点**仅逆向时**兜底为 P，
// 正向维持原口径（起点=全部）不动，免得改变既有行为。
const effectivePointRoles = () => {
  const { startRole, endRole } = chainPointRoles()
  return {
    effStartRole: startRole || (reverseMode.value ? 'P' : null),
    effEndRole: endRole || 'D'
  }
}

// 链的下发点数（后端 stationNum）：<2 表示只下发终点（单点链），没有"起点"可对调，故不能逆向。
// 取不到时退化为默认链；再取不到按 2（与后端兜底默认链 0001 一致），不能因取不到就当单点挡住。
const chainStationNum = () => {
  const pick = (code) => {
    const item = taskChainList.value.find(o => o.value === code)
    const n = item && item.stationNum != null ? Number(item.stationNum) : NaN
    return isNaN(n) ? null : n
  }
  const cur = pick(pickedTaskChain.value)
  if (cur != null) return cur
  const fallback = pick(DEFAULT_TASK_CHAIN)
  return fallback != null ? fallback : 2
}

// 库位状态是否满足角色要求：取货点=占用(非空闲)、送货点=空闲、停靠/盘点/未知=不限
const statusMatchRole = (status, role) => {
  if (role === 'P') return status !== 1
  if (role === 'D') return status === 1
  return true
}

// 点位角色 → 后端 status 查询参数。后端只支持单值：送货点(D)按空闲(1)收窄；
// 取货点(P) 要的是"非空闲"，而占用态不止 2（取消流程里还见过 3/4/9），故 P 不传 status，
// 统一交给 statusMatchRole 在客户端收窄 —— 与 fetchLocationRows / lockDefAreas 同一口径。
const queryStatusForRole = (role) => (role === 'D' ? 1 : null)

// 开始库位候选列表为空时的提示：起点是取货点(P)时说"没有有货库位"，
// 别一律说成"工序起止库区配置有问题"——逆向时起点是父库区(烘干房)，全空闲是业务常态。
const startListEmptyTip = () => {
  const role = pickedDefCode.value ? effectivePointRoles().effStartRole : null
  return role === 'P'
    ? '该库区当前没有有货(占用)库位，请确认方向或直接扫码指定'
    : '该库区暂无可用的开始库位，请先确认工序起止库区配置'
}

// 库位名称（形如 1F-YGA-6-9）= 前缀-行-列，排序要按**数字**比：
// 直接比字符串会把 -6-10 排到 -6-9 前面（列号有到 18 的），现场看着就是"没排"。
const locationNameKey = (code) => {
  const matched = String(code == null ? '' : code).match(/(\d+)-(\d+)$/)
  return matched ? [Number(matched[1]), Number(matched[2])] : [-1, -1]
}

// 库位名称兜底排序：名称为大者在前 —— 与 WCS 自动分配库位、orderedList 的默认口径一致
// （种子里的 sortNo 升序就是"编号从大到小"）。
const sortByLocationNameDesc = (rows) => rows.slice().sort((left, right) => {
  const a = locationNameKey(left['code'])
  const b = locationNameKey(right['code'])
  if (a[0] !== b[0]) return b[0] - a[0]
  if (a[1] !== b[1]) return b[1] - a[1]
  return String(right['code']).localeCompare(String(left['code']))
})

// 有 sortNo（搬运顺序）就认服务端的顺序；一条都没有（新打点还没刷顺序）才退回名称排序。
// 顺序本身是库区级配置（wcs.move.order.<库区码>，含方向），客户端不猜它。
const orderByMoveOrder = (rows) => (rows.some(item => item['sortNo'] != null) ? rows : sortByLocationNameDesc(rows))

// 取库位原始行：**优先**走「按搬运顺序排好序」的接口——它的顺序和 WCS 自动分配库位时
// 实际挑取的一致（按库区可配方向，默认先搬靠后的行列），操作员顺着列表挑就不会和系统反着来。
// 该接口不可用（未部署/出错）时回退到普通列表接口，保证页面照常能用；
// 但这个接口不保证顺序（旧版本按 id 排，1F-YGA/1F-SYSS/1F-YGB/1F-HGC 的 id 升序正好是编号从小到大），
// 所以回退这一路一律按库位名称补一道排序 —— 免得候选列表"没排"、操作员从头挑。
const fetchLocationRows = async (areaId, status, role) => {
  try {
    const res = await LocationOrderedList({ areaId })
    const list = res && res.data ? (Array.isArray(res.data) ? res.data : (res.data.list || [])) : []
    if (list.length > 0) return orderByMoveOrder(list)
  } catch (e) {
    console.log('拉取搬运顺序库位失败，回退普通列表：', e)
  }
  // 后端 status 只支持单值：有角色就按角色取（D→空闲，其余不传、交前端过滤）；
  // 没角色（CTU / 旧点到点流程）沿用调用方给的 status
  const queryStatus = role == null ? status : queryStatusForRole(role)
  const res = await LocationInfo({ areaId, pageNo: 1, pageSize: 10000, ...(queryStatus != null ? { status: queryStatus } : {}) })
  const rows = res && res.data ? (Array.isArray(res.data) ? res.data : (res.data.list || [])) : []
  return sortByLocationNameDesc(rows)
}

// 拉取某库区库位，组装成可点选列表（扫码之外也可点选）；role 为该点位角色，null=不过滤。
// 选中的可能是**父库区**：orderedList 后端已展平，普通列表接口没有，所以这里统一按子区顺序
// 逐区拉再拼接，两条路都通。子区顺序天然实现"先 A 区后 B 区"。
const loadLocationsForArea = async (areaId, targetList, status, onEmpty, role) => {
  if (!areaId) return
  try {
    let rows = []
    for (const leaf of resolveLeafAreas(areaId)) {
      rows = rows.concat(await fetchLocationRows(leaf.id, status, role))
    }
    const arr = rows.filter(item => statusMatchRole(item['status'], role))
      .map(item => ({ text: item['code'], value: item['code'] }))
    targetList.splice(0, targetList.length, ...arr)
    if (onEmpty) onEmpty(arr.length === 0)
  } catch (e) {
    console.log('拉取库位列表失败：', e)
  }
}

// 在工序给的库区范围里选一个：keepCode 命中范围就沿用它（下发成功复位时保留操作员选过的子区），
// 否则落在这个范围的第一个（areaCode 升序）；范围为空（库区列表还没加载出来）时退回工序配的库区本身。
const pickInRange = (opts, fallback, keepCode) => {
  if (keepCode) {
    const kept = opts.find(o => o.value === keepCode)
    if (kept) return kept
  }
  return (opts.length ? opts[0] : null) || fallback
}

// 选中工序后按定义配置锁定/填充起止库区；并预载“可点选”的起止库位。
// 这是**唯一的方向入口**：reverseMode 打开时把定义的起点/终点对调后再填——
// 调用点（选工序 / 切车辆类型 / 切任务类型 / 切方向 / 下发成功复位）都走这里，方向自动一致。
// **批量开关不在其中**：开关不改变"该有哪些候选"，开/关都不该动库区（见 handleBatchToggle）。
// keepAreas = {startArea, endArea}：只有下发成功复位会传，用来保留操作员当前选的子区；
// 其余调用点不传 = 落回范围内的第一个子区（选工序/切类型时本来就该按新范围重置）。
const lockDefAreas = async (def, keepAreas) => {
  if (!def) {
    // 没选工序 = 不锁，恢复成全量库区下拉（只清锁定态，不动已选库区）
    startAreaOptions.value = null
    endAreaOptions.value = null
    return
  }
  const defStart = def.startAreaId ? startAreaList.value.find(x => x.id === def.startAreaId) : null
  const defEnd = def.endAreaId ? endAreaList.value.find(x => x.id === def.endAreaId) : null
  // 锁定/配置合法性仍按定义本身判断，与方向无关
  startAreaLocked.value = !!defStart
  endAreaLocked.value = !!defEnd
  defConfigInvalid.value = !(defStart && defEnd)
  const useStart = reverseMode.value ? defEnd : defStart
  const useEnd = reverseMode.value ? defStart : defEnd
  // 工序锁到父区 = 只定**范围**，让操作员在其子区里挑；锁到子区 = 就是它一个（见 areaOptionsOf）。
  // 默认落在这个范围的第一个（areaCode 升序）；库区列表没加载出来时 areaOptionsOf 返回空，
  // 此时退回工序配的那个库区本身。
  const startOpts = useStart ? areaOptionsOf(useStart.value) : []
  const endOpts = useEnd ? areaOptionsOf(useEnd.value) : []
  startAreaOptions.value = startOpts.length ? startOpts : null
  endAreaOptions.value = endOpts.length ? endOpts : null
  // 这里**不禁用**下拉：候选只剩一个只是说明这个范围目前只有这一个子区（如 1F烘干房二
  // 还没打点、下面暂无子区），并不是"终点不能换"。置灰会让操作员以为终点没做子库区选择，
  // 而且后台一加子区（烘干D…）这里就会自动多出一项，届时无需改代码。
  const startPick = pickInRange(startOpts, useStart, keepAreas && keepAreas.startArea)
  const endPick = pickInRange(endOpts, useEnd, keepAreas && keepAreas.endArea)
  data.value.startArea = startPick ? startPick.value : null
  data.value.endArea = endPick ? endPick.value : null
  // 方向变了，之前选的库位不再对应，一并清掉
  data.value.startLocation = null
  data.value.endLocation = null
  // 起点/终点库位候选按「任务链该点位的角色」过滤。
  // **角色跟着链的位置走，不随方向换**——逆向只是把库区对调，位置1仍是"取货点"、位置2仍是"送货点"；
  // 于是"搬运的物理前提"在两个方向上都自动成立：
  //   去搬运的那一头（起点）必须有货 → 取货点 P 只列**占用**库位；
  //   搬运到的那一头（终点）必须空着 → 送货点 D 只列**空闲**库位。
  // 正向：起点=原起点(有货)、终点=原终点(空闲)；逆向：起点=原终点(送完就是占用)、终点=原起点(取完就是空闲)。
  // 停靠(K)/盘点(C) 不过滤。
  const { effStartRole, effEndRole } = effectivePointRoles()
  if (startPick && startPick.id) {
    await loadLocationsForArea(startPick.id, startLocationList.value, null, v => { startFlag.value = v }, effStartRole)
  } else {
    startLocationList.value = []
    startFlag.value = true
  }
  if (endPick && endPick.id) {
    await loadLocationsForArea(endPick.id, endLocationList.value, 1, v => { endFlag.value = v }, effEndRole)
  } else {
    endLocationList.value = []
    endFlag.value = true
  }
}

// ===== 批量配对 =====

// 当前可用的起点/终点库位码：直接取 lockDefAreas 已按「搬运顺序(服务端 sortNo) + 点位角色」排好并
// 过滤过的候选列表，保证自动配对挑出来的库位与顺序，跟操作员照着单选列表挑的完全一致。
const eligibleStartCodes = () => startLocationList.value.map(i => i.value)
const eligibleEndCodes = () => endLocationList.value.map(i => i.value)

// 试算自动配对计划：起点/终点各按顺序排列后「第 k 个配第 k 个」，条数 = 两侧取小。
// 已下发过的（本地记忆）先剔掉，于是连着发两批会自动往后跳到没发过的库位。
const refreshBatchPlan = () => {
  const starts = skipDispatched(eligibleStartCodes())
  const ends = skipDispatched(eligibleEndCodes())
  const n = Math.min(starts.length, ends.length)
  batchPairs.value = Array.from({ length: n }, (_, k) => ({ start: starts[k], end: ends[k] }))
  batchPlanTotal.value = n
  batchCount.value = n
  batchCountInput.value = n > 0 ? String(n) : ''
}

// 手动多选的配对：同样「第 k 个配第 k 个」，数量不等取小
const manualPairs = () => {
  const n = Math.min(agvSelStartLocs.value.length, agvSelEndLocs.value.length)
  return Array.from({ length: n }, (_, k) => ({ start: agvSelStartLocs.value[k], end: agvSelEndLocs.value[k] }))
}

// 条数输入夹取到 [0, 全搬]（非数字回落到全搬）
const onBatchCountChange = () => {
  const n = parseInt(batchCountInput.value, 10)
  const v = isNaN(n) ? batchPlanTotal.value : Math.min(Math.max(n, 0), batchPlanTotal.value)
  batchCount.value = v
  batchCountInput.value = String(v)
}
const fillBatchCountAll = () => {
  batchCount.value = batchPlanTotal.value
  batchCountInput.value = String(batchPlanTotal.value)
}

// 手动多选：点选/取消
const toggleAgvSel = (which, locCode) => {
  const arr = which === 'start' ? agvSelStartLocs : agvSelEndLocs
  const idx = arr.value.indexOf(locCode)
  if (idx >= 0) arr.value.splice(idx, 1)
  else arr.value.push(locCode)
}
const removeAgvSel = (which, idx) => {
  const arr = which === 'start' ? agvSelStartLocs : agvSelEndLocs
  if (idx >= 0) arr.value.splice(idx, 1)
}

// 扫码加入多选：校验口径与单选流程一致（库位存在 → 属于 AGV 库区 → 属于工序锁定的库区 → 点位角色可用）
const pushAgvSelByScan = (which, raw) => {
  const val = (raw || '').trim()
  if (!val) return
  const arr = which === 'start' ? agvSelStartLocs : agvSelEndLocs
  const label = which === 'start' ? '开始库位' : '终点库位'
  const loc = allLocationList.value.find(i => i.code === val)
  if (!loc) {
    Dialog.alert({ message: `库位 ${val} 不存在` })
    return
  }
  const areaList = which === 'start' ? startAreaList.value : endAreaList.value
  const area = areaList.find(a => a.id === loc.areaId)
  if (!area) {
    Dialog.alert({ message: `库位 ${val} 不属于AGV库区，请扫描AGV库区下的库位` })
    return
  }
  const curArea = which === 'start' ? data.value.startArea : data.value.endArea
  if (curArea && !sameAreaGroupByCode(area.value, curArea)) {
    Dialog.alert({ message: `库位 ${val} 不属于所选工序的${which === 'start' ? '起点' : '终点'}库区` })
    return
  }
  const { effStartRole, effEndRole } = effectivePointRoles()
  const role = which === 'start' ? effStartRole : effEndRole
  if (!statusMatchRole(loc.status, role)) {
    Dialog.alert({ message: `库位 ${val} ${which === 'start' ? '不满足取货要求（需有货）' : '不满足送货要求（需空闲）'}` })
    return
  }
  if (arr.value.includes(val)) {
    Dialog.alert({ message: `${label} ${val} 已添加` })
    return
  }
  arr.value.push(val)
}

const handleAgvScanStartEnter = () => {
  const v = agvScanStartInput.value
  agvScanStartInput.value = ''
  pushAgvSelByScan('start', v)
}
const handleAgvScanEndEnter = () => {
  const v = agvScanEndInput.value
  agvScanEndInput.value = ''
  pushAgvSelByScan('end', v)
}

// 批量开关：打开时校验（不通过就把开关拨回去），并按当前方向重载候选后试算配对计划
const handleBatchToggle = async (val) => {
  const reject = (msg) => {
    batchMode.value = false
    Dialog.alert({ message: msg })
  }
  if (!val) {
    // 只切模式，不重载：候选由「切库区 / 选工序 / 切方向 / 切任务类型」维护，开关不改变候选范围。
    // 原来这里也调 lockDefAreas，关一次就会把操作员选好的子区拨回范围内的第一个（原因见下面那一支）。
    batchMode.value = false
    return
  }
  if (vehicleType.value !== 'agv') return reject('当前车辆类型不支持批量下发')
  if (!pickedDef.value) return reject('请先选择工序')
  if (defConfigInvalid.value) {
    return reject(`工序「${pickedDef.value.name || pickedDef.value.code}」未配置起止库区，无法批量下发`)
  }
  if (chainStationNum() < 2) {
    return reject('当前任务类型只有一个下发点，无法批量配对，请改选两点任务类型（如 0001）')
  }
  batchMode.value = true
  resetAgvSel()
  // 这里**刻意不重载**：候选列表在「切库区 / 选工序 / 切方向 / 切任务类型 / 切车辆类型」时已经按
  // 「搬运顺序 + 点位角色」维护好了，开关本身不改变"该有哪些候选"。
  // 原来这里调 lockDefAreas，它会把起止库区落回工序范围里的**第一个子区**（areaOptionsOf(...)[0]）：
  // 操作员为了避开空子区特意切到的兄弟子区会被抹掉，于是每次都拿第一个子区算计划 ——
  // 那个子区若刚好没有满足角色的库位（如终点范围 1F烘干房一 下第一个子区 1F-HGA 全是占用，
  // 而送货点角色要求空闲，兄弟区 1F-HGB/1F-HGC 却有 35 个空位），就会报"没有可配对的库位"，
  // 且切一次被抹一次，怎么切都打不开开关。
  refreshBatchPlan()
  if (batchPlanTotal.value === 0) {
    batchMode.value = false
    Dialog.alert({ message: '当前起止库区没有可配对的库位（起点需有货、终点需空闲），无法批量下发' })
  }
}

// 逆向开关：校验不通过就回退开关；通过则按新方向清空并重载起终库区/库位
const handleReverseToggle = async (val) => {
  // 校验只在"打开"时做；不过就立刻把开关拨回去
  const reject = (msg) => {
    reverseMode.value = false
    Dialog.alert({ message: msg })
  }
  if (val) {
    if (!pickedDef.value) return reject('请先选择工序')
    if (defConfigInvalid.value) {
      return reject(`工序「${pickedDef.value.name || pickedDef.value.code}」未配置起止库区（起点/终点库区需同时在后台“主任务配置”中设置），无法逆向`)
    }
    if (chainStationNum() < 2) {
      return reject('当前任务类型只有一个下发点，无法逆向，请改选两点任务类型（如 0001）')
    }
  }
  const hadLocation = !!(data.value.startLocation || data.value.endLocation)
  reverseMode.value = val
  if (pickedDef.value) await lockDefAreas(pickedDef.value)
  if (val && pickedDef.value && pickedDef.value.startAreaId && pickedDef.value.startAreaId === pickedDef.value.endAreaId) {
    Toast({ message: '该工序起终点同库区，逆向与正向相同', duration: 2500 })
  }
  if (hadLocation) {
    Toast({ message: '已按新方向清空库位，请重新选择或扫码', duration: 2500 })
  }
  // 方向变了，多选的库位与自动配对计划都失效，一并重来
  resetAgvSel()
  if (batchMode.value) refreshBatchPlan()
}

// 定义驱动显示：起止库区可见；起点/终点库位“可扫码也可点选”，终点可不选(后端自动分配)
const applyDefShow = (def) => {
  show.value = {
    startAreaVisible: true,
    startLocationVisible: true,
    startLocationScanVisible: true,
    endAreaVisible: true,
    endLocationVisible: true,
    endLocationScanVisible: true,
    materialScanVisible: false,
    materialVisible: false,
    boxCodeVisible: false,
    palletTypeVisible: false,
    productCodeVisible: false
  }
}

const handlePickedDefChange = (codeVal) => {
  const def = defMap.value[codeVal]
  if (!def) return
  pickedDef.value = def
  pickedDefCode.value = def.code
  code.value = def.code
  // 重置表单字段，保留定义锁定的起止库区
  Object.keys(data.value).forEach(k => { data.value[k] = null })
  startLocationList.value = []
  endLocationList.value = []
  startFlag.value = true
  endFlag.value = true
  resetAgvSel()
  lockDefAreas(def).then(() => { if (batchMode.value) refreshBatchPlan() })
  applyDefShow(def)
  if (defConfigInvalid.value) {
    // 新工序连起终点库区都没配，逆向/批量都无从谈起，开关一并复位
    reverseMode.value = false
    batchMode.value = false
    Dialog.alert({ message: `工序「${def.name || def.code}」未配置起止库区（起点/终点库区需同时在后台“主任务配置”中设置），禁止下发` })
  }
}

const loadDefinitions = async () => {
  try {
    const res = await pdaTaskMenu({})
    if (res && res.result === 0 && Array.isArray(res.data) && res.data.length > 0) {
      definitionList.value = res.data.map(d => ({ text: `${d.name}（${d.code}）`, value: d.code }))
      defMap.value = {}
      res.data.forEach(d => { defMap.value[d.code] = d })
      definitionDisabled.value = false
      // 默认选中第一个已配置好起止库区的工序；否则留空，由操作员在列表中挑选
      const firstValid = res.data.find(d => d.startAreaId && d.endAreaId)
      if (firstValid) {
        handlePickedDefChange(firstValid.code)
      }
    } else {
      definitionDisabled.value = true
      code.value = ''
    }
  } catch (e) {
    definitionDisabled.value = true
    code.value = ''
    console.log('工序列表加载失败：', e)
  }
}

// 任务类型（RCS 任务链）下拉：后端返回全部启用的链（系统内置 + 自定义），
// 展示文案 text 由后端给（系统链名不可改，后端用「组成」替代）。
// 拉不到就留空数组 → 模板里整行不渲染，下单走后端默认链，不影响主流程。
const DEFAULT_TASK_CHAIN = '0001' // 取货 → 送货
const loadTaskChains = async () => {
  try {
    const res = await rcsTaskChains()
    if (res && res.result === 0 && Array.isArray(res.data)) {
      // 额外带上 stationNum/stationRoles：下拉只用 text/value，其余供起终点候选按角色过滤
      taskChainList.value = res.data.map(d => ({
        text: d.text || `${d.name}（${d.code}）`,
        value: d.value || d.code,
        stationNum: d.stationNum,
        stationRoles: d.stationRoles
      }))
    } else {
      taskChainList.value = []
    }
  } catch (e) {
    taskChainList.value = []
    console.log('任务类型（RCS 任务链）加载失败：', e)
  }
  // 默认选中 0001；列表里没有就留空（后端会兜底默认链）
  if (!pickedTaskChain.value) {
    pickedTaskChain.value = taskChainList.value.some(o => o.value === DEFAULT_TASK_CHAIN)
      ? DEFAULT_TASK_CHAIN
      : ''
  }
}

// 整行都能点开下拉：标签（.expression）和下拉控件是同一行里的两个独立元素，
// Vant 只让下拉自己的标题区响应点击。这里让点标签时「转点」同一行下拉的标题元素，
// 从而展开选项（该行没有下拉时 querySelector 返回 null，自然 no-op）。
const openRowDropdown = (e) => {
  const row = e.currentTarget && e.currentTarget.parentElement
  if (!row) return
  // Vant 真正绑 click 的是 .van-dropdown-menu__item（不是 __title，也不是 __content）
  const item = row.querySelector('.van-dropdown-menu__item')
  if (item) item.click()
}

// ===== 烤房温度门禁：终点为烤房位 KF<n> 时，查温度/阈值并展示、超温或读取失败禁发 =====
const furnaceInfo = ref(null) // {furnaceNo, channelNo, temperature, threshold, state, message}
const furnaceBlocked = ref(false)
const furnaceLoading = ref(false)
const KF_CODE_REGEX = /^KF(\d+)$/i

const refreshFurnace = async (endLocationCode) => {
  if (!endLocationCode || !KF_CODE_REGEX.test(endLocationCode)) {
    furnaceInfo.value = null
    furnaceBlocked.value = false
    furnaceLoading.value = false
    return
  }
  furnaceLoading.value = true
  try {
    const res = await getFurnaceStatus(endLocationCode)
    const info = res && res.data ? res.data : null
    furnaceInfo.value = info
    furnaceBlocked.value = !!(info && (info.state === 'OVER' || info.state === 'UNREACHABLE'))
  } catch (e) {
    furnaceInfo.value = { state: 'UNREACHABLE', message: '烤房温度查询异常，禁止下发', temperature: null, threshold: null }
    furnaceBlocked.value = true
  } finally {
    furnaceLoading.value = false
  }
}

watch(() => data.value.materialCode, (newVal) => {
  if (newVal) {
    const regex = /\d{2}-\d{3}-\d{5}-\d{2}/
    let material = newVal['match'](regex) ? newVal['match'](regex) : []
    if (material.length > 0) {
      data.value.materialCode = material[0]
    } else {
      data.value.materialCode = null
      Dialog.alert({ message: '未识别出物料编码' })
    }
  }
})

// 监听车辆类型变化，切换任务类型列表
watch(() => vehicleType.value, async (newVal) => {
  // 重置数据和显示状态
  Object.keys(data.value).forEach(key => { data.value[key] = null })
  ctuSelectedStartLocations.value = []
  ctuSelectedEndLocations.value = []
  ctuBoxCodes.value = []
  ctuScanStartInput.value = ''
  ctuScanEndInput.value = ''
  ctuScanBoxInput.value = ''
  ctuProductCodes.value = []
  ctuProductLots.value = []
  ctuScanProductInput.value = ''
  // 重置 AGV 产品编码
  agvProductCodes.value = []
  agvProductLots.value = []
  agvScanProductInput.value = ''
  // 清空库位列表
  startLocationList.value = []
  endLocationList.value = []
  startFlag.value = true
  endFlag.value = true
  // 切车辆类型视为换了一种作业方式，逆向/批量开关一并复位（CTU 本来就没有这两个概念）
  reverseMode.value = false
  batchMode.value = false
  resetAgvSel()
  // 从后端重新拉取对应车辆类型的库区列表
  await applyAreaListByVehicleType(newVal)
  if (newVal === 'ctu') {
    code.value = 'ZTEV1_TASK1'
    taskType.value = 'ctu_out'
    applyCtuShow('ctu_out')
  } else {
    taskType.value = 1
    if (pickedDef.value) {
      // 区域列表已按新车辆类型刷新，重新按定义锁定/填充起止
      code.value = pickedDef.value.code
      lockDefAreas(pickedDef.value)
      applyDefShow(pickedDef.value)
    } else {
      code.value = ''
    }
  }
})

// 监听开始库位输入框的显示状态
watch(() => show.value.startLocationVisible, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      console.log('Start location visible changed, attempting to focus')
      focusStartLocationInput()
    }, 200)
  }
})

watch(() => data.value.startLocation, (newVal) => {
  // 赋值逻辑已移至 checkStartLocation，由 Enter 或扫码触发
})
watch(() => data.value.endLocation, (newVal) => {
  // 终点为烤房位时刷新烤房温度门禁
  refreshFurnace(newVal)
})

// 扫码输入框按下 Enter 后触发的检测逻辑
const checkStartLocation = (val) => {
  if (!val) return
  const startLocation = allLocationList.value.filter(item => item['code'] === val)
  if (startLocation.length > 0) {
    // 校验库位必须属于AGV库区（后端已过滤好的 startAreaList 即为AGV库区）
    const area = startAreaList.value.find(a => a.id === startLocation[0]['areaId'])
    if (!area) {
      Dialog.alert({ message: `库位 ${val} 不属于AGV库区，请扫描AGV库区下的库位` })
      data.value.startLocation = null
      return
    }
    if (startAreaLocked.value && data.value.startArea && !sameAreaGroupByCode(area.value, data.value.startArea)) {
      Dialog.alert({ message: `库位 ${val} 不属于所选工序的起点库区` })
      data.value.startLocation = null
      return
    }
    // 已选库区覆盖该库位时保持不动（选了父库区就不要再被改写成子区）
    if (!data.value.startArea || !sameAreaGroupByCode(area.value, data.value.startArea)) {
      data.value.startArea = area.value
    }
    const obj = { text: val, value: val }
    if (!startLocationList.value.find(i => i.value === val)) {
      startLocationList.value.push(obj)
    }
    
    // 如果库位数据包含 hasCargo 字段，自动赋值到是否有货下拉框
    if (startLocation[0]['hasCargo'] !== undefined && startLocation[0]['hasCargo'] !== null) {
      data.value.hasCargo = String(startLocation[0]['hasCargo'])
    }
  }
  if (taskType.value === 3) {
    GetLocation(val, 'start')
  }
}

const checkEndLocation = (val) => {
  if (!val) return
  const endLocation = allLocationList.value.filter(item => item['code'] === val)
  if (endLocation.length > 0) {
    // 校验库位必须属于AGV库区（后端已过滤好的 endAreaList 即为AGV库区）
    const area = endAreaList.value.find(a => a.id === endLocation[0]['areaId'])
    if (!area) {
      Dialog.alert({ message: `库位 ${val} 不属于AGV库区，请扫描AGV库区下的库位` })
      data.value.endLocation = null
      return
    }
    if (endAreaLocked.value && data.value.endArea && !sameAreaGroupByCode(area.value, data.value.endArea)) {
      Dialog.alert({ message: `库位 ${val} 不属于所选工序的终点库区` })
      data.value.endLocation = null
      return
    }
    // 已选库区覆盖该库位时保持不动（选了父库区就不要再被改写成子区）
    if (!data.value.endArea || !sameAreaGroupByCode(area.value, data.value.endArea)) {
      data.value.endArea = area.value
    }
    const obj = { text: val, value: val }
    if (!endLocationList.value.find(i => i.value === val)) {
      endLocationList.value.push(obj)
    }
  }
  if (taskType.value === 3) {
    GetLocation(val, 'end')
  }
}

onMounted(async () => {
  await GetAreaInfo()
  await getAllLocation()
  // 初始化 AGV 显示状态（默认车辆类型是 agv，任务类型是 1）
  applyAgvShow(1)
  // 加载工序定义菜单（定义驱动，默认选中第一项工序）
  await loadDefinitions()
  // 加载任务类型（RCS 任务链）下拉选项
  await loadTaskChains()
  // 页面加载完成后聚焦到开始库位输入框，增加延迟确保组件完全渲染
  setTimeout(() => {
    console.log('Attempting to focus start location input on mount')
    focusStartLocationInput()
  }, 1000)
})

onUnmounted(() => {
  stopCamera()
  if (codeReader) {
    codeReader.reset()
  }
})

const getAllLocation = async () => {
  const result = await LocationInfo({
    pageNo: 1,
    pageSize: 100000,
    // status: 1
  })
  if (result['data'].length > 0) {
    allLocationList.value = []
    result['data'].forEach(item => {
      allLocationList.value.push(item)
    })
  } else {
    await Dialog.alert({ message: '获取库位数据失败' })
  }
}

// 获取库区
const GetAreaInfo = async () => {
  // 根据当前车辆类型向后端请求对应的库区列表
  await fetchAreaList(vehicleType.value)
}

// 按车辆类型从后端拉取库区列表
const fetchAreaList = async (type) => {
  const result = await AreaInfo({
    pageNo: 1,
    pageSize: 10000,
    vehicleType: type  // 后端根据此字段过滤：ctu=名称以"库区"结尾，agv=名称不以"库区"结尾
  })
  const list = []
  if (result['data'] !== null) {
    result['data'].forEach(item => {
      list.push({
        // 父库区只是分组壳，下拉里标注出来，免得操作员以为选错了
        text: item['parentId'] ? item['areaName'] : `${item['areaName']}（父库区）`,
        value: item['areaCode'],
        id: item['id'],
        parentId: item['parentId'] || null
      })
    })
  }
  // 父库区行紧挨在其子库区之前（同组内按 areaCode）。后端是 id desc，不排的话父子交错看不清层级。
  list.sort((a, b) => {
    const ga = a.parentId ? a.parentId : a.id
    const gb = b.parentId ? b.parentId : b.id
    if (ga !== gb) return ga - gb
    return String(a.value).localeCompare(String(b.value))
  })
  startAreaList.value = list
  endAreaList.value = list
}

// 库区 id 展开成叶子库区列表：选中的是**父库区**时返回其子库区（按 areaCode 升序），
// 否则返回 [自己]。库位只挂子库区，所以所有"按库区查库位"的地方都要先过这里。
const resolveLeafAreas = (areaId) => {
  const children = startAreaList.value
    .filter(item => item.parentId === areaId)
    .sort((a, b) => String(a.value).localeCompare(String(b.value)))
  return children.length ? children : [{ id: areaId }]
}

// 库区编码 → 所属"库区分组"根 id（子库区归其父库区，父库区/独立库区归自己）。
// 选中父库区时，其子区库位算同一个区——否则「库位不属于所选工序的库区」会误报。
const areaGroupIdOfCode = (areaCode) => {
  const item = startAreaList.value.find(a => a.value === areaCode)
  if (!item) return null
  return item.parentId || item.id
}
const sameAreaGroupByCode = (codeA, codeB) => {
  const ga = areaGroupIdOfCode(codeA)
  const gb = areaGroupIdOfCode(codeB)
  return ga != null && ga === gb
}

// 工序锁定某个库区后，下拉里列什么由「锁的是父区还是子区」决定：
//   锁到子区 → 就是它一个，**不放宽到兄弟子区**——工序锁的是确切库位，
//              「下料1 成型A→成型B」两端都是子区，放宽会让操作员把起点挑成 成型C。
//              要把一端配成范围，就在后台把工序的起止库区改挂到父区上。
//   锁到父区 → 该工序只定**范围**，列出它的所有子区供操作员挑（如 烘干1：阴干A→烘干房一，
//              操作员在 烘干A/烘干B/烘干C 里挑一个）；父区是分组壳、自己没库位，
//              所以进了候选也只会让操作员看到"该库区没有可用库位"，不会有别的副作用。
//              （父区还没打点/还没建子区时会走到这一支：候选=父区自己，等同"暂时发不出去"。）
// 库区列表还没加载出来时返回空，调用方回退到原来的「直接用工序配的库区」行为。
const areaOptionsOf = (areaCode) => {
  const locked = startAreaList.value.find(a => a.value === areaCode)
  if (!locked) return []
  if (locked.parentId) return [locked]
  const children = startAreaList.value
    .filter(a => a.parentId === locked.id)
    .sort((a, b) => String(a.value).localeCompare(String(b.value)))
  return children.length ? children : [locked]
}
// 锁定态的库区下拉候选：null = 未锁定，模板里回落到全量列表。
// 候选只剩一个也不置灰（见 lockDefAreas），操作员始终能展开看这一层锁的是哪个范围。
const startAreaOptions = ref(null)
const endAreaOptions = ref(null)

// 根据车辆类型切换库区列表（切换车辆类型时调用）
const applyAreaListByVehicleType = async (type) => {
  await fetchAreaList(type)
}

// 获取物料列表
const getMaterialOptions = async (locationCode) => {
  const result = await MaterialOptions(locationCode)
  materialList.value = []
  if (result.data) {
    result.data.forEach(element => {
      materialList.value.push({
        text: element['materialName'],
        value: element['materialCode']
      })
    })
  }
}

// 批量下发前的烤房门禁：旧的 furnaceBlocked 门禁挂在 watch(data.endLocation) 上，而批量流程不写
// data.endLocation（恒 null）=> 那个门禁不会触发。这里取首个终点作代表位预检，在创建**任何**任务之前
// fail fast，避免产生"半批"；其余终点若也命中烤房，由后端逐单回 6007/6008/6009 落进失败清单。
const preflightFurnace = async (pairs) => {
  const firstEnd = (pairs.find(p => p && p.end) || {}).end
  if (!firstEnd) return true
  await refreshFurnace(firstEnd)
  if (furnaceBlocked.value) {
    await Dialog.alert({
      message: (furnaceInfo.value && furnaceInfo.value.message) || `终点 ${firstEnd} 烤房温度校验未通过，禁止下发`
    })
    return false
  }
  return true
}

// 批量请求体：循环前拍快照，之后只有 startLocation/endLocation 逐条变。
// 这样操作员中途改工序/库区也不会污染后面的任务。
const buildAgvOrderBase = () => ({
  type: taskType.value,
  orderCode: code.value,
  vehicleType: vehicleType.value,
  startArea: data.value.startArea,
  endArea: data.value.endArea,
  palletType: data.value.palletType,
  hasCargo: data.value.hasCargo,
  materialCode: data.value.materialCode,
  // 与单条流程一致：带上该工序的子任务 id，供后端查目的地锁定时长
  childTaskId: (pickedDef.value && pickedDef.value.taskChildPos && pickedDef.value.taskChildPos.length)
    ? pickedDef.value.taskChildPos[0].id
    : null,
  taskChainCode: pickedTaskChain.value || null,
  productCodes: agvProductCodes.value.length > 0 ? agvProductCodes.value : [],
  productLots: agvProductLots.value.length > 0 ? agvProductLots.value : [],
  taskCount: 1 // 必须 1：>1 会被后端同一个 orderVo 复制成"同库位多实例"
})

// 逐条串行下发：失败不中断整批，逐条收集后一次性汇总
const submitAgvBatch = async (pairs) => {
  buttonDisabled.value = true
  const base = buildAgvOrderBase()
  const ok = []
  const fail = []
  let aborted = 0
  for (let i = 0; i < pairs.length; i++) {
    const { start, end } = pairs[i]
    batchProgress.value = `正在下发 ${i + 1}/${pairs.length}：${start} → ${end}（每条需等门开到位，约 16 秒）`
    try {
      const res = await orderNew({ ...base, startLocation: start || null, endLocation: end || null })
      // Token 失效时 request.js 的拦截器会 resolve 成 Dialog 的 promise（没有 result 字段）=> 中止剩余任务
      if (!res || res.result === undefined) {
        aborted = pairs.length - i
        break
      }
      if (res.result === 0) ok.push({ start, end })
      else fail.push({ start, end, code: res.result, message: res.message || '未知错误' })
    } catch (e) {
      fail.push({
        start,
        end,
        code: (e && e.response && e.response.status) || 'EX',
        message: (e && e.message) || '请求异常'
      })
    }
  }
  buttonDisabled.value = false
  batchProgress.value = ''
  rollbackDispatched(fail) // 失败的没真正占位，撤回，下次还能用
  markDispatched(ok)       // 记下已下发的，下一批自动往后跳
  await getAllLocation()

  const lines = []
  if (ok.length) lines.push(`成功 ${ok.length} 条：${ok.map(p => `${p.start}→${p.end}`).join('、')}`)
  if (fail.length) lines.push(`失败 ${fail.length} 条：${fail.map(p => `${p.start}→${p.end}（${p.code}）${p.message}`).join('；')}`)
  if (aborted > 0) lines.push(`登录状态异常，剩余 ${aborted} 条未下发`)
  await Dialog.alert({ message: lines.length ? lines.join('\n') : '没有任务被下发', showCancelButton: false })

  // 复位：清表单、清多选、清产品码、链回默认；按当前方向重载候选并重算下一批计划
  Object.keys(data.value).forEach(key => { data.value[key] = null })
  resetAgvSel()
  agvProductCodes.value = []
  agvProductLots.value = []
  agvScanProductInput.value = ''
  pickedTaskChain.value = taskChainList.value.some(o => o.value === DEFAULT_TASK_CHAIN)
    ? DEFAULT_TASK_CHAIN
    : ''
  if (pickedDef.value) {
    await lockDefAreas(pickedDef.value)
    if (batchMode.value) refreshBatchPlan()
  }
}

const SubmitOrder = async () => { // 提交订单
  // 防重入：下面是一次会阻塞十几秒的下发调用，双击会重复下发
  if (buttonDisabled.value) return

  let flag = true

  // CTU 任务校验和提交
  if (vehicleType.value === 'ctu') {

    if (taskType.value === 'ctu_out') {
      // 出库：需要开始库区 + 至少1个开始库位，目的库位固定为 CTU_FIXED_LOCATION
      if (!data.value.startArea) {
        await Dialog.alert({ message: '请选择开始库区' }); return
      }
      if (ctuSelectedStartLocations.value.length === 0) {
        await Dialog.alert({ message: '请至少选择1个开始库位' }); return
      }
    } else if (taskType.value === 'ctu_in') {
      // 入库：只需目的库区 + 料箱编码，目的库位由后端自动分配
      if (!data.value.endArea) {
        await Dialog.alert({ message: '请选择目的库区' }); return
      }
      if (ctuBoxCodes.value.length === 0) {
        await Dialog.alert({ message: '请至少扫描1个料箱编码' }); return
      }
      if (CTU_MAX_LOCATIONS.value === 0) {
        await Dialog.alert({ message: '该库区暂无空闲库位，无法入库' }); return
      }
      if (ctuBoxCodes.value.length > CTU_MAX_LOCATIONS.value) {
        await Dialog.alert({ message: `料箱编码数量（${ctuBoxCodes.value.length}）超出库区空闲库位数（${CTU_MAX_LOCATIONS.value}），请减少料箱数量` }); return
      }
      // 产品编码校验：非必填；但一旦扫了，数量必须与料箱数量严格一致
      if (ctuProductCodes.value.length > 0 && ctuProductCodes.value.length !== ctuBoxCodes.value.length) {
        await Dialog.alert({
          message: `料箱编码（${ctuBoxCodes.value.length}个）与产品编码（${ctuProductCodes.value.length}个）数量不一致，请补齐或全部清空后再发起订单`
        }); return
      }
    }

    // 构建批量请求体
    buttonDisabled.value = true

    // 根据任务类型确定固定库位和库区
    // ctu_out：开始库区/库位由用户选，目的库位固定
    // ctu_in：开始库位固定，目的库区由用户选
    const batchData = {
      type: taskType.value,
      orderCode: code.value,
      vehicleType: vehicleType.value,

      // 开始库区：出库时用用户选的，入库时为 null（开始库位固定，无需库区）
      startArea: taskType.value === 'ctu_in' ? null : data.value.startArea,
      // 目的库区：入库时用用户选的，出库时为 null（目的库位固定，无需库区）
      endArea: taskType.value === 'ctu_out' ? null : data.value.endArea,

      // 料箱编码（入库时使用）
      boxCode: taskType.value === 'ctu_in' ? (ctuBoxCodes.value[0] || null) : null,
      boxCodes: taskType.value === 'ctu_in' ? ctuBoxCodes.value : [],

      // 产品信息（入库时使用）
      // 产品编码和批号为非必填项；若未扫描，则用与料箱数量等长的空字符串数组填充，
      // 保证后端能按索引（boxCodes[i] ↔ productCodes[i]）对齐处理
      productCode: taskType.value === 'ctu_in' ? (ctuProductCodes.value[0] || null) : null,
      productCodes: taskType.value === 'ctu_in'
        ? (ctuProductCodes.value.length > 0 ? ctuProductCodes.value : ctuBoxCodes.value.map(() => ''))
        : [],
      productLots: taskType.value === 'ctu_in'
        ? (ctuProductLots.value.length > 0 ? ctuProductLots.value : ctuBoxCodes.value.map(() => ''))
        : [],

      // 多库位列表
      // 入库时开始库位固定，不传列表；出库时传用户选的开始库位列表
      startLocations: taskType.value === 'ctu_in' ? null : ctuSelectedStartLocations.value,
      // 出库/入库均由固定库位或后端分配，不传目的库位列表
      endLocations: null,

      // 固定库位（单条兼容字段）
      // 入库：开始库位固定为 CTU_FIXED_LOCATION
      startLocation: taskType.value === 'ctu_in' ? CTU_FIXED_LOCATION : null,
      // 出库：目的库位固定为 CTU_FIXED_LOCATION
      endLocation: taskType.value === 'ctu_out' ? CTU_FIXED_LOCATION : null
    }

    try {
      const result = await orderNew(batchData)
      buttonDisabled.value = false
      const msg = result ? result.message : '请求失败'
      // 下发成功后立即刷新库位数据，不等用户点确认
      if (result && result.result === 0) {
        getAllLocation()
      }
      Dialog.alert({ message: msg, showCancelButton: false }).then(() => {
        // 重置所有 CTU 相关数据
        Object.keys(data.value).forEach(key => { data.value[key] = null })
        ctuSelectedStartLocations.value = []
        ctuSelectedEndLocations.value = []
        ctuBoxCodes.value = []
        ctuScanStartInput.value = ''
        ctuScanEndInput.value = ''
        ctuScanBoxInput.value = ''
        ctuProductCodes.value = []
        ctuProductLots.value = []
        ctuScanProductInput.value = ''
        // 保持当前任务类型不变
        applyCtuShow(taskType.value)
      })
    } catch (e) {
      buttonDisabled.value = false
      Dialog.alert({ message: '批量任务提交异常：' + e.message })
    }
    return
  }

  // 烤房温度门禁：终点为烤房位且超温/读取失败时禁止下发
  if (furnaceBlocked.value) {
    await Dialog.alert({ message: (furnaceInfo.value && furnaceInfo.value.message) || '烤房温度校验未通过，禁止下发' })
    return
  }

  // AGV 必须选定工序（定义驱动）。无可用工序/未配置起止约束时禁止下发，避免空 orderCode 误匹配任意启用定义
  if (!pickedDefCode.value) {
    await Dialog.alert({ message: '请先选择工序；如列表为空，请先在后台“主任务配置”中启用任务定义' })
    return
  }
  if (defConfigInvalid.value) {
    await Dialog.alert({ message: '所选工序未配置起止库区，禁止下发。请先在后台“主任务配置”为该工序配置起点/终点库区' })
    return
  }

  // ===== 工序定义驱动的 AGV：批量下发（自动配对 / 手动多选）=====
  if (vehicleType.value === 'agv' && pickedDefCode.value) {
    if (batchMode.value) {
      // 输入框可能还没失焦就被点了「发起订单」，先把里面的值夹取同步进来，免得按旧条数多发
      onBatchCountChange()
      const pairs = batchPairs.value.slice(0, batchCount.value)
      if (!pairs.length) {
        await Dialog.alert({
          message: batchPlanTotal.value === 0
            ? '没有可下发的配对，请确认起止库区里有可用库位（起点需有货、终点需空闲）'
            : `下发条数为 0，当前最多可发 ${batchPlanTotal.value} 条，请填写 1~${batchPlanTotal.value}`
        })
        return
      }
      // 逐条串行 + 每条要等门开到位（现场实测约 15.6s），条数多时先确认
      if (pairs.length > 10) {
        try {
          await Dialog.confirm({
            message: `将逐条串行下发 ${pairs.length} 条任务，预计约 ${Math.ceil(pairs.length * 16 / 60)} 分钟，继续？`
          })
        } catch (e) { return }
      }
      if (!(await preflightFurnace(pairs))) return
      await submitAgvBatch(pairs)
      return
    }
    // 手动多选：一个都没选 -> 落到下面的旧逻辑（起终点留空、后端自动分配 1 条），保持现有习惯
    if (agvSelStartLocs.value.length || agvSelEndLocs.value.length) {
      if (!agvSelStartLocs.value.length || !agvSelEndLocs.value.length) {
        await Dialog.alert({ message: '起点和终点库位需各选至少 1 个' })
        return
      }
      const pairs = manualPairs()
      if (agvSelStartLocs.value.length !== agvSelEndLocs.value.length) {
        try {
          await Dialog.confirm({
            message: `起点 ${agvSelStartLocs.value.length} 个、终点 ${agvSelEndLocs.value.length} 个数量不一致，将按较小的 ${pairs.length} 条下发，继续？`
          })
        } catch (e) { return }
      }
      if (!(await preflightFurnace(pairs))) return
      await submitAgvBatch(pairs)
      return
    }
  }

  // AGV 任务校验
  if (pickedDefCode.value) {
    // 工序定义驱动：只要求起止【库区】。
    // 起点/终点的【库位】都可留空 —— 不选则由后端在对应库区内自动分配空闲点位
    // （TaskChildServiceImpl.buildChild：orderVo.startArea/endArea -> getAllocatableLocation）
    if (!data.value.startArea) flag = false
    if (show.value.endAreaVisible && !data.value.endArea) flag = false
  } else {
    if (taskType.value === 1) {
      // 点到点：需要开始库区、开始库位、目的库区、目的库位、托盘类型、是否有货
      if (!data.value.startArea) flag = false
      if (!data.value.startLocation) flag = false
      if (!data.value.endArea) flag = false
      if (show.value.endLocationVisible && !data.value.endLocation) flag = false
      if (!data.value.palletType) flag = false
      // 检查是否有货：优先检查下拉框，如果下拉框为空则检查输入框
      if (!data.value.hasCargoInput) flag = false
    }
    if (taskType.value === 2) {
      // 点到区域：需要开始库区、开始库位、目的库区、托盘类型；终点库位由后端自动从目的库区中分配空闲库位，无需前端填写
      if (!data.value.startArea) flag = false
      if (!data.value.startLocation) flag = false
      if (!data.value.endArea) flag = false
      if (!data.value.palletType) flag = false
    }
    if (taskType.value === 3) {
      // 区域到点：需要开始库区、目的库区、目的库位、物料编码、托盘类型
      if (!data.value.startArea) flag = false
      if (!data.value.endArea) flag = false
      if (!data.value.endLocation) flag = false
      if (!data.value.materialCode) flag = false
      if (!data.value.palletType) flag = false
    }
  }

  if (flag) {
    buttonDisabled.value = true
    data.value.type = taskType.value
    data.value.orderCode = code.value
    data.value.vehicleType = vehicleType.value
    // 工序定义驱动：把该工序对应的子任务id带给后端，用于按子任务查目的地锁定时长（当前每定义1个子任务，取第一个）
    data.value.childTaskId = (pickedDef.value && pickedDef.value.taskChildPos && pickedDef.value.taskChildPos.length)
      ? pickedDef.value.taskChildPos[0].id
      : null
    // 任务类型（RCS 任务链）：未选则传 null，由 WCS 后端兜底默认链
    data.value.taskChainCode = pickedTaskChain.value || null

    // AGV 产品编码信息（非必填）
    // 若未扫描，则用空数组填充，保证后端能按索引对齐处理
    data.value.productCodes = agvProductCodes.value.length > 0 ? agvProductCodes.value : []
    data.value.productLots = agvProductLots.value.length > 0 ? agvProductLots.value : []

    const result = await orderNew(data.value)
    if (result) {
      buttonDisabled.value = false
    }
    // 下发成功后立即刷新库位数据，不等用户点确认
    if (result && result.result === 0) {
      getAllLocation()
      // 逆向开关立刻复位（下一单默认回到正向）；不能放在弹窗回调里，操作员不点确认就不会复位
      reverseMode.value = false
    }
    Dialog.alert({
      message: result['message'],
      showCancelButton: false
    }).then(() => {
      // 下发后库位状态已变，下面要按新状态重载候选；但起止**库区**要保留操作员正在用的子区
      // （不保留就会落回工序范围内的第一个子区，批量连发第二批时又会变成"没有可配对的库位"）。
      const keepAreas = { startArea: data.value.startArea, endArea: data.value.endArea }
      Object.keys(data.value).forEach(key => {
        data.value[key] = null
      })
      // 重置 AGV 产品编码
      agvProductCodes.value = []
      agvProductLots.value = []
      agvScanProductInput.value = ''
      // 任务类型复位到默认链 0001（避免上一单选的类型被无意识沿用到下一单）
      pickedTaskChain.value = taskChainList.value.some(o => o.value === DEFAULT_TASK_CHAIN)
        ? DEFAULT_TASK_CHAIN
        : ''
      // 定义驱动：保留所选工序与起止库区（keepAreas），只按新状态重载库位候选
      if (pickedDef.value) {
        lockDefAreas(pickedDef.value, keepAreas)
      }
    })
  } else {
    await Dialog.alert({ message: '请填写所有必填项' })
  }
}

// 切换任务类型（RCS 任务链）后，起终点候选要按新链的角色重新过滤（取货点/送货点要求不同），
// 之前选中的库位可能不再满足新角色，一并清掉重选。
const handleTaskChainChange = async () => {
  data.value.startLocation = null
  data.value.endLocation = null
  // 单点链没有"起点"可对调，逆向不成立，自动取消
  if (reverseMode.value && chainStationNum() < 2) {
    reverseMode.value = false
    Toast({ message: '该任务类型只有一个下发点，已自动取消逆向', duration: 2500 })
  }
  if (batchMode.value && chainStationNum() < 2) {
    batchMode.value = false
    Toast({ message: '该任务类型只有一个下发点，已自动取消批量下发', duration: 2500 })
  }
  resetAgvSel()
  if (pickedDef.value) await lockDefAreas(pickedDef.value)
  if (batchMode.value) refreshBatchPlan()
}

const handleTaskTypeChange = (value) => {
  // 重置所有数据
  Object.keys(data.value).forEach(key => { data.value[key] = null })
  ctuSelectedStartLocations.value = []
  ctuSelectedEndLocations.value = []
  ctuBoxCodes.value = []
  ctuScanStartInput.value = ''
  ctuScanEndInput.value = ''
  ctuScanBoxInput.value = ''
  // 清空库位列表，避免上次选择的库区库位残留
  startLocationList.value = []
  endLocationList.value = []
  startFlag.value = true
  endFlag.value = true
  // 重置 AGV 产品编码
  agvProductCodes.value = []
  agvProductLots.value = []
  agvScanProductInput.value = ''

  if (vehicleType.value === 'ctu') {
    applyCtuShow(value)
    return
  }

  // AGV 任务类型处理
  applyAgvShow(value)
  setTimeout(() => { focusStartLocationInput() }, 300)
}

// CTU 显示状态控制
const applyCtuShow = (value) => {
  if (value === 'ctu_out') {
    // 出库：显示开始库区/库位，隐藏目的库区/库位（目的库位固定只读）
    show.value = {
      startAreaVisible: true,
      startLocationVisible: true,
      endAreaVisible: false,
      endLocationVisible: false,
      materialScanVisible: false,
      materialVisible: false,
      boxCodeVisible: false,
      palletTypeVisible: false,
      productCodeVisible: true  // CTU出库也需要产品编码和批号
    }
    data.value.endLocation = CTU_FIXED_LOCATION
    CTU_MAX_LOCATIONS.value = 6   // 重置为默认值
  } else if (value === 'ctu_in') {
    // 入库：隐藏开始库区/库位（开始库位固定只读），只显示目的库区和料箱编码
    // 目的库位由后端根据库区自动分配，前端不再选择
    show.value = {
      startAreaVisible: false,
      startLocationVisible: false,
      endAreaVisible: true,
      endLocationVisible: false,   // 隐藏目的库位多选
      materialScanVisible: false,
      materialVisible: false,
      boxCodeVisible: true,
      palletTypeVisible: false,
      productCodeVisible: false
    }
    data.value.startLocation = CTU_FIXED_LOCATION
    CTU_MAX_LOCATIONS.value = 6   // 重置为默认值，选库区后会动态更新
  }
}

// AGV 显示状态控制
const applyAgvShow = (value) => {
  let arr = {}
  if (value === 1) arr = spotSendSpotVisible.value
  if (value === 2) arr = spotSendAreaVisible.value
  if (value === 3) arr = materialSendSpot.value
  Object.keys(show.value).forEach(key => {
    show.value[key] = arr.hasOwnProperty(key) ? arr[key] : false
  })
}

const handleChangeHasCargo = async () => {
  data.value.startLocation = null
  startLocationList.value = []
  if (!data.value.startArea) {
    await Dialog.alert({ message: '请先选择开始库区' })
    data.value.hasCargo = null
    return
  }

  let areaId = ''
  startAreaList.value.forEach((item) => {
    if (item.value === data.value.startArea) {
      areaId = item.id
    }
  })

  // 父库区展开成子库区逐个查（库位只挂子库区，直接查父区为空）
  const leaves = resolveLeafAreas(areaId)
  const leafIds = leaves.map(l => l.id)

  console.log('handleChangeHasCargo - areaId:', areaId, 'hasCargo:', data.value.hasCargo)

  try {
    for (const leaf of leaves) {
      const res = await LocationInfo({
        pageNo: 1,
        pageSize: 100000,
        areaId: leaf.id,
        status: 2,
        hasCargo: data.value.hasCargo
      })
      console.log('handleChangeHasCargo - LocationInfo 返回:', res)
      let list = []
      if (res && res.data) {
        list = Array.isArray(res.data) ? res.data : (res.data.list || [])
      }
      console.log('handleChangeHasCargo - list:', list)
      sortByLocationNameDesc(list).forEach(item => {
        const code = item['code']
        startLocationList.value.push({ text: code, value: code })
        const idx = allLocationList.value.findIndex(l => l.code === code)
        if (idx >= 0) allLocationList.value[idx] = item
        else allLocationList.value.push(item)
      })
    }
    console.log('handleChangeHasCargo - startLocationList:', startLocationList.value)
  } catch (e) {
    console.log('handleChangeHasCargo - 异常:', e)
    sortByLocationNameDesc(
      allLocationList.value.filter(item => leafIds.includes(item['areaId']) && item['status'] === 2)
    ).forEach(item => {
      const code = item['code']
      startLocationList.value.push({ text: code, value: code })
    })
  }
  startFlag.value = startLocationList.value.length === 0
}

const handleChangeAreaOption = async (occupiedState) => {
  let areaId = ''
  let areaCode = ''
  if (occupiedState === 0){
    endAreaList.value.forEach((item) => {
      if (item.value === data.value.endArea){
        areaId = item.id
        areaCode = item.value
      }
    })
  }
  if (occupiedState === 1){
    startAreaList.value.forEach((item) => {
      if (item.value === data.value.startArea){
        areaId = item.id
        areaCode = item.value
      }
    })
  }

  // 父库区展开成子库区逐个查（库位只挂子库区，直接查父区为空）
  const leaves = resolveLeafAreas(areaId)
  const leafIds = leaves.map(l => l.id)

  if (occupiedState === 1) {
    startLocationList.value = []
    data.value.startLocation = null
    ctuSelectedStartLocations.value = []
    // 手选开始库区会走到这里，必须按「起点角色」取状态，否则会把 lockDefAreas 已经筛好的
    // 候选换成反面：逆向时起点是父库区(如 1F烘干房一)，操作员必须手选子区，于是把空闲库位
    // 列成了取货候选。只有工序驱动才按角色收窄，CTU / 旧点到点流程维持原口径（status=1）。
    const effStartRole = pickedDefCode.value ? effectivePointRoles().effStartRole : null
    const startQueryStatus = effStartRole == null ? 1 : queryStatusForRole(effStartRole)
    try {
      for (const leaf of leaves) {
        const params = { pageNo: 1, pageSize: 100000, areaId: leaf.id }
        if (startQueryStatus != null) {
          params.status = startQueryStatus
        }
        if (data.value.hasCargo) {
          params.hasCargo = data.value.hasCargo
        }
        const res = await LocationInfo(params)
        let list = []
        if (res && res.data) {
          list = Array.isArray(res.data) ? res.data : (res.data.list || [])
        }
        sortByLocationNameDesc(list.filter(item => statusMatchRole(item['status'], effStartRole))).forEach(item => {
          startLocationList.value.push({ text: item['code'], value: item['code'] })
          // 同步更新 allLocationList 中对应库位的状态，保证扫码校验也用最新数据
          const idx = allLocationList.value.findIndex(l => l.code === item['code'])
          if (idx >= 0) allLocationList.value[idx] = item
          else allLocationList.value.push(item)
        })
      }
    } catch (e) {
      // 请求失败时降级使用缓存数据
      sortByLocationNameDesc(
        allLocationList.value
          .filter(item => leafIds.includes(item['areaId']))
          .filter(item => statusMatchRole(item['status'], effStartRole))
      ).forEach(item => {
        startLocationList.value.push({ text: item['code'], value: item['code'] })
      })
    }
    startFlag.value = startLocationList.value.length === 0
    if (taskType.value === 3) {
      await getMaterialOptions(areaCode)
    }
  }
  if (occupiedState === 0) {
    endLocationList.value = []
    data.value.endLocation = null
    ctuSelectedEndLocations.value = []
    // 点到区域（type=2）：终点库位由后端自动分配，前端无需加载库位列表
    if (taskType.value !== 2) {
      // 同起点：有角色就按角色取（送货点 D→只列空闲；停靠 K / 盘点 C 不按状态收窄，
      // 免得 0002(K,K)、0003(D,K) 这类链被硬套成"终点必须空闲"）
      const effEndRole = pickedDefCode.value ? effectivePointRoles().effEndRole : null
      const endQueryStatus = effEndRole == null ? 1 : queryStatusForRole(effEndRole)
      try {
        // 实时请求后端拉候选；父库区按子区顺序逐个查再拼接
        for (const leaf of leaves) {
          const params = { pageNo: 1, pageSize: 100000, areaId: leaf.id }
          if (endQueryStatus != null) {
            params.status = endQueryStatus
          }
          const res = await LocationInfo(params)
          let list = []
          if (res && res.data) {
            list = Array.isArray(res.data) ? res.data : (res.data.list || [])
          }
          sortByLocationNameDesc(list.filter(item => statusMatchRole(item['status'], effEndRole))).forEach(item => {
            endLocationList.value.push({ text: item['code'], value: item['code'] })
            // 同步更新 allLocationList 中对应库位的状态
            const idx = allLocationList.value.findIndex(l => l.code === item['code'])
            if (idx >= 0) allLocationList.value[idx] = item
            else allLocationList.value.push(item)
          })
        }
      } catch (e) {
        // 请求失败时降级使用缓存数据
        sortByLocationNameDesc(
          allLocationList.value
            .filter(item => leafIds.includes(item['areaId']))
            .filter(item => statusMatchRole(item['status'], effEndRole))
        ).forEach(item => {
          endLocationList.value.push({ text: item['code'], value: item['code'] })
        })
      }
      endFlag.value = endLocationList.value.length === 0
    }
    if (taskType.value === 2) {
      show.value.materialScanVisible = temporaryArea.value.includes(data.value.endArea)
    }
    // ctu_in 入库：选库区后查询空闲库位数量，动态更新料箱编码最大输入数
    if (taskType.value === 'ctu_in' && areaCode) {
      try {
        const countRes = await ctuInAvailableCount(areaCode)
        if (countRes && countRes.result === 0 && countRes.data) {
          const count = countRes.data.count || 0
          CTU_MAX_LOCATIONS.value = Math.min(Math.max(count, 0), 6)
          // 如果已扫料箱超出新上限，截断
          if (ctuBoxCodes.value.length > CTU_MAX_LOCATIONS.value) {
            ctuBoxCodes.value = ctuBoxCodes.value.slice(0, CTU_MAX_LOCATIONS.value)
          }
          if (CTU_MAX_LOCATIONS.value === 0) {
            Toast('该库区暂无空闲库位，无法入库')
          }
        }
      } catch (e) {
        console.warn('查询空闲库位数量失败，使用默认值6', e)
        CTU_MAX_LOCATIONS.value = 6
      }
    }
  }

  // 库区换了，批量配对计划必须跟着重算：计划读的就是上面刚重载的 startLocationList/endLocationList，
  // 不重算就会继续拿**上一个库区**的库位码下发（现象：切到 烘干B 发起订单，点位仍是 烘干A）。
  if (batchMode.value) refreshBatchPlan()
}

// 聚焦到开始库位输入框
const focusStartLocationInput = () => {
  if (show.value.startLocationVisible) {
    nextTick(() => {
      try {
        // 尝试多种方式获取input元素
        let inputElement = null

        if (startLocationInput.value) {
          // 方式1: 通过组件实例的$el
          if (startLocationInput.value.$el) {
            inputElement = startLocationInput.value.$el.querySelector('input')
          }
          // 方式2: 直接查找input
          if (!inputElement && startLocationInput.value.querySelector) {
            inputElement = startLocationInput.value.querySelector('input')
          }
          // 方式3: 通过类名查找
          if (!inputElement) {
            inputElement = document.querySelector('.taskList input[placeholder="请扫描开始库位"]')
          }
        }

        if (inputElement) {
          inputElement.focus()
          console.log('Start location input focused successfully')
        } else {
          console.log('Could not find start location input element')
        }
      } catch (error) {
        console.error('Error focusing start location input:', error)
      }
    })
  }
}

// 聚焦到终点库位输入框
const focusEndLocationInput = () => {
  if (show.value.endLocationVisible) {
    nextTick(() => {
      try {
        // 尝试多种方式获取input元素
        let inputElement = null

        if (endLocationInput.value) {
          // 方式1: 通过组件实例的$el
          if (endLocationInput.value.$el) {
            inputElement = endLocationInput.value.$el.querySelector('input')
          }
          // 方式2: 直接查找input
          if (!inputElement && endLocationInput.value.querySelector) {
            inputElement = endLocationInput.value.querySelector('input')
          }
          // 方式3: 通过类名查找
          if (!inputElement) {
            inputElement = document.querySelector('.taskList input[placeholder="请扫描终点库位"]')
          }
        }

        if (inputElement) {
          inputElement.focus()
          console.log('End location input focused successfully')
        } else {
          console.log('Could not find end location input element')
        }
      } catch (error) {
        console.error('Error focusing end location input:', error)
      }
    })
  }
}

// 处理开始库位输入框回车事件
const handleStartLocationEnter = () => {
  checkStartLocation(data.value.startLocation)
  setTimeout(() => {
    focusEndLocationInput()
  }, 100)
}

// 处理终点库位输入框回车事件
const handleEndLocationEnter = () => {
  checkEndLocation(data.value.endLocation)
}

// 获取摄像头并选择后置摄像头
const getBackCamera = async (code) => {
  try {
    loadingShow.value = true
    const devices = await navigator.mediaDevices.enumerateDevices()
    let backCameraId = null

    // 找到后置摄像头
    devices.forEach(device => {
      if (device.kind === 'videoinput') {
        if (device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear')) {
          backCameraId = device.deviceId
        }
      }
    })

    // 如果找到后置摄像头，使用它
    if (backCameraId) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: backCameraId } }
      })
    } else {
      // 尝试使用 facingMode 强制调用后置摄像头
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: 'environment' } }
      })
    }

    // 将视频流绑定到 video 元素上
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      startQRCodeReader(code)
    }
  } catch (err) {
    loadingShow.value = false
    await Dialog.alert({ message: '无法访问摄像头: ' + err.message })
  }
}

// 销毁视频流
const stopCamera = async () => {
  if (stream) {
    // 停止所有轨道
    stream.getTracks().forEach(track => track.stop())
    stream = null // 清空流的引用
  }
}

// 开始扫描二维码
const startQRCodeReader = async (code) => {
  if (videoElement.value) {
    const video = videoElement.value
    // 初始化二维码阅读器（懒加载，避免安卓旧版浏览器启动时崩溃）
    const ZxingReader = await loadZxing()
    codeReader = new ZxingReader()
    // 使用 zxing 的 decodeFromVideoElement 方法
    codeReader.decodeFromVideoElement(video).then(result => {
      if (result) {
        switch (code) {
          case 'material': // 扫描物料
            let material = JSON.parse(JSON.stringify(result))
            scanMaterial(material.text)
            break
          case 'start': // 扫描起点库位（AGV）
            scanStartLocation(result)
            break
          case 'end': // 扫描终点库位（AGV）
            scanEndLocation(result)
            break
          case 'boxCode': // 扫描料箱编码（CTU入库，多条）
            ctuScanBoxInput.value = JSON.parse(JSON.stringify(result)).text
            handleCtuScanBoxEnter()
            break
          case 'ctu_start': // 扫描CTU开始库位（多选）
            ctuScanStartInput.value = JSON.parse(JSON.stringify(result)).text
            handleCtuScanStartEnter()
            break
          case 'ctu_end': // 扫描CTU目的库位（多选）
            ctuScanEndInput.value = JSON.parse(JSON.stringify(result)).text
            handleCtuScanEndEnter()
            break
        }
        loadingShow.value = false
        stopCamera()
        if (codeReader) {
          codeReader.reset() // 重置二维码扫描器
        }
      }
    })
  }
}

const scanMaterial = (value) => {
  data.value.materialCode = value
}

const scanEndLocation = (value) => {
  const result = JSON.parse(JSON.stringify(value))
  data.value.endLocation = result.text
  checkEndLocation(result.text)
}

const scanStartLocation = (value) => {
  const result = JSON.parse(JSON.stringify(value))
  data.value.startLocation = result.text
  checkStartLocation(result.text)
}

// 获取库位信息
const GetLocation = async (locationCode, code) => {
  await getOne({ locationCode: locationCode }).then(res => {
    if (res.data != null) {
      switch (code) {
        case 'start':
          if (res.data['occupiedState'] === 1) {
            data.value.startLocation = res.data['locationCode']
            Dialog.alert({ message: `扫描库位： ${data.value.startLocation}` })
          } else {
            Dialog.alert({ message: '扫描的库位未被占用' })
            data.value.startLocation = null
          }
          break
        case 'end':
          if (res.data['occupiedState'] === 0) {
            data.value.endLocation = res.data['locationCode']
            Dialog.alert({ message: `扫描库位： ${data.value.endLocation}` })
          } else {
            Dialog.alert({ message: '扫描的库位已被占用' })
            data.value.endLocation = null
          }
          break
      }
    } else {
      Dialog.alert({ message: '扫描的库位码不存在，请重新扫描' })
      if (code === 'start') {
        data.value.startLocation = null
      } else {
        data.value.endLocation = null
      }
    }
  })
}
</script>
<style lang="less" scoped>
.search {
  background-color: #f1f1f1;
  border: 1px solid #ddd;
  padding: 5px;
  margin: 5px;
}

::v-deep .van-divider {
  margin: 0.03rem 0;
}

/* 下拉包裹层：撑满 label 右侧剩余宽度，让整行都成为可点区域 */
.dd-wrap {
  flex: 1;
  min-width: 0;   /* 允许收缩，避免窄屏溢出 */
  display: flex;
}

::v-deep .van-dropdown-menu {
  margin: 0 !important;
  flex: 1;
  /* ★ min-width:0 必须：下拉文字是 white-space:nowrap，min-content = 整段文字宽度，
     不加这个它会把左侧标签挤成一条、把整行撑爆 */
  min-width: 0;
  min-height: 0.44rem;
  height: auto !important;
}

/* 下拉条固定 44px 高：原来 height:100% 在无高度的父级里会塌掉，手指点不准。
   注意：这条灰底就是【下拉控件本身】，不是多余的框；下面把可点的 item 撑满它。 */
::v-deep .van-dropdown-menu__bar {
  height: 0.44rem !important;
  min-height: 0.44rem;
  min-width: 0;                    /* 同上：允许被压缩，长文字走省略号 */
  background: #f7f8fa !important;
  box-shadow: 0 3px 45px rgb(100 101 102 / 12%) !important
}

/* Vant 把 click 绑在 __item 上（默认已是 flex:1），这里再撑满整条高度 */
::v-deep .van-dropdown-menu__item {
  height: 100%;
}

/* 文本区撑满整条 —— 关键：Vant 里 __title 是 <span>（display:inline），
   不加 display:block 时 width:100% 完全不生效，所以没有文字时只剩一个箭头，
   看起来/点起来都只有短短一小段。 */
::v-deep .van-dropdown-menu__title {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  padding: 0 0.26rem 0 0.08rem;   /* 右侧留出箭头位置 */
  line-height: 0.44rem;
  font-size: 0.15rem;
}

/* 箭头从"紧跟文字"改到整条右端（Vant 默认 right:-4px 会贴文字后面/溢出） */
::v-deep .van-dropdown-menu__title::after {
  right: 0.1rem;
}

.taskType {
  font-size: 18px;
}

.taskList {
  width: 92%;
  padding: 1% 0.5%;
  border: 1px solid #000;
  border-radius: 5px;
  margin: 0 3% 0.14rem;

  div {
    margin: 0.02rem;
    display: flex;
    font-size: 0.15rem;

    .two-thirds {
      width: 64%;
    }

    ::v-deep .van-radio-group {
      height: 100%;
      flex: 1;
      background: #f7f8fa;
      margin: 0 1% 0 0;
    }

    h6 {
      height: 100%;
      width: 100%;
      display: flex;

      p {
        button {
          width: 100%;
          height: 100%;
          margin: 0 0 0 -0.1rem;
          padding: 0.04rem 0 0 0;
          background: #fff;
          color: #1989fa;
        }
      }
    }

    p {
      margin: 0 1%;
      width: 100%;
      background: #f7f8fa;
      line-height: 0.26rem;
      text-indent: 0.1rem;

      button {
        width: 100%;
        height: 100%;
        margin: 0 0 0 -0.1rem;
        padding: 0.04rem 0 0 0;
      }

      .field {
        margin: 0;
        padding: 0;
        height: 100%;

        ::v-deep .van-field__label {
          width: 0.6rem !important;

          span {
            line-height: 0.28rem;
            color: #000;
          }

        }

      }
    }

    .NameInfo {
      width: 0.8rem;
      background: #fff;
    }

    .expression {
      width: 1.6rem;
      /* ★ 不许被压缩：否则下拉里的 nowrap 长文字会把标签挤成一条（曾出现标签只剩 30px） */
      flex: 0 0 auto;
      background: #fff;
    }

    .fff {
      background: #fff;
    }
  }
}

.scan {
  font-size: 0.26rem;
}

/* CTU 多选库位样式 */
.ctu-multi-select {
  flex-direction: column !important;
  box-sizing: border-box;
}

.multi-select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 0.06rem;
}

.select-count {
  font-size: 0.12rem;
  color: #1989fa;
  background: #fff !important;
  width: auto !important;
  padding-right: 0.1rem;
}

.count-warn {
  color: #ee0a24 !important;
}

.multi-select-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.06rem;
  padding: 0.04rem 0;
  width: 100%;
}

.location-tag {
  margin: 0.02rem;
  font-size: 0.12rem;
}

/* 自定义选中 tag，完全脱离 Vant 样式干扰 */
.sel-tag {
  display: inline-flex;
  align-items: center;
  padding: 0 0.08rem;
  height: 0.26rem;
  line-height: 0.26rem;
  font-size: 0.12rem;
  border-radius: 3px;
  color: #fff;
  margin: 0.02rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.sel-tag--primary {
  background-color: #1989fa;
}

.sel-tag--success {
  background-color: #07c160;
}

.sel-tag--warning {
  background-color: #ff976a;
}

.sel-tag-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.18rem;
  height: 0.18rem;
  margin-left: 0.06rem;
  font-size: 0.15rem;
  font-style: normal;
  line-height: 1;
  cursor: pointer;
  opacity: 0.85;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
}

.sel-tag-close:active {
  opacity: 1;
  background: rgba(0, 0, 0, 0.32);
}

/* 扫码输入行 */
.scan-input-row {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 0.04rem 0;
}

.scan-input {
  flex: 1;
  padding: 0 !important;
  margin: 0 !important;
  height: 100% !important;
}

.multi-select-list {
  width: 100%;
  /* 换行平铺，不做横向滑动：横滑在触摸屏上极易误触（想点库位却滑走了） */
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.06rem;
  padding: 0.06rem;
  border: 1px solid #eee;
  border-radius: 4px;
  box-sizing: border-box;
  /* 防止内容撑破父容器边框 */
  max-width: 100%;
}

/* 选择器写到 .multi-select-list 下，才能盖掉 .taskList div 的 margin/font-size（它的优先级是 class+element） */
.multi-select-list .location-item {
  display: inline-flex;
  flex: 0 0 auto;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 0.06rem 0.12rem;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  font-size: 0.13rem;
  cursor: pointer;
  background: #fff;
  transition: background 0.2s;
  white-space: nowrap;
  min-width: 0.6rem;
}

.location-item .van-icon {
  margin-left: 0.04rem;
}

.location-item.selected {
  background: #ecf5ff;
  color: #1989fa;
  border-color: #1989fa;
  font-weight: 600;
}

.location-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.location-item:active:not(.disabled) {
  background: #f0f9ff;
}

.no-location-tip {
  color: #999;
  font-size: 0.12rem;
  text-align: center;
  padding: 0.1rem 0;
  background: #fff !important;
}

/* 逆向搬运开关行：开关靠 label 左侧对齐（下拉包裹层默认 flex:1 会把开关顶到最右） */
.reverse-switch-wrap {
  justify-content: flex-start;
  align-items: center;
}

.reverse-tip {
  color: #ff976a;
  font-size: 0.12rem;
  padding: 0.06rem 0 0 0.1rem;
}

/* 批量条数输入：占满标签右侧剩余宽度，「全搬」按钮不被压缩 */
.batch-count-field {
  flex: 1;
  min-width: 0;
  padding: 0 !important;
  margin: 0 !important;
  height: 100% !important;
  background: #f7f8fa;
}

.taskList .batch-count-field + .van-button {
  flex: 0 0 auto;
  margin: 0 0 0 0.06rem;
}

.fixed-location {
  background: #e8e8e8;
  color: #888;
  padding-left: 0.1rem;
  line-height: 0.26rem;
}

.searchSty {
  padding: 0;
  margin: 0 !important;
  height: 100% !important;

  div {
    padding: 0;
    margin: 0 !important;
    height: 100% !important;
  }

  input {
    line-height: 100%;
    text-indent: 0.1rem;
  }

  ::v-deep .van-field__left-icon {
    display: none;
  }
}

.bgc-f4f4f4 {
  background-color: #363636;
}

.scan {
  font-size: 0.26rem;
}

.video {
  width: 100vw;
  height: 100vh;
  z-index: 1;
}

.video-show {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 70vw;
  height: 70vw;
  z-index: 2;
  background: linear-gradient(to left, #fff, #fff) left top no-repeat,
  linear-gradient(to bottom, #fff, #fff) left top no-repeat,
  linear-gradient(to left, #fff, #fff) right top no-repeat,
  linear-gradient(to bottom, #fff, #fff) right top no-repeat,
  linear-gradient(to left, #fff, #fff) left bottom no-repeat,
  linear-gradient(to bottom, #fff, #fff) left bottom no-repeat,
  linear-gradient(to left, #fff, #fff) right bottom no-repeat,
  linear-gradient(to left, #fff, #fff) right bottom no-repeat;
  background-size: 2px 20px, 20px 2px, 2px 20px, 20px 2px;
}

.butShow {
  width: 92%;
  padding: 2% 0.5%;
  // border: 1px solid #000;
  margin: 0 3.5% 0.14rem;

  button {
    height: 0.32rem !important;
    width: 100% !important;
    line-height: 0.32rem !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}

::v-deep .van-button__content,
.van-button__text {
  height: 0.32rem !important;
  width: 100% !important;
  line-height: 0.28rem !important;
  margin: 0 !important;
  padding: 0 !important;
}

::v-deep .van-dropdown-item__content {
  position: absolute;
  max-height: 60%;
  width: calc(96% - 2px);
  margin: 0 0 0 2%;
  border: 2px solid #000;
}

::v-deep .van-icon-success:before {
  margin-left: -20px;
  content: '\e728';
}
</style>
