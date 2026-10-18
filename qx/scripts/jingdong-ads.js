/*
 * 京东 iOS 15.3.30 广告响应清理（Quantumult X）
 *
 * 依据：原始 Mach-O 中真实存在的广告字段名，以及 84 点客户端补丁覆盖的广告类型。
 * 只删除广告/浮层/弹窗/直播小窗相关字段，保留商品、价格、购物车、订单等业务字段。
 * 解析失败时原样放行，避免影响正常接口。
 */

(function () {
const url = $request.url;
const body = $response.body;

if (!body) {
  $done({});
  return;
}

let data;
try {
  data = JSON.parse(body);
} catch (e) {
  console.log('jingdong-ads: JSON parse failed, pass through');
  $done({});
  return;
}

const functionId = (url.match(/[?&]functionId=([^&]+)/) || [])[1] || '';

// 开屏接口兜底：规则已 reject-dict，这里再兜一层。
if (functionId === 'start') {
  console.log('jingdong-ads: drop splash start');
  $done({ body: '{}' });
  return;
}

// 从二进制提取的真实广告字段。
const DROP_KEYS = new Set([
  'advertTitle', 'advertImg', 'adList', 'advGrpId', 'advertId',
  'advertGroup', 'advertGroupData', 'advertGroupId', 'advertGroupList', 'advertGroupResult',
  'materialData', 'adInfo', 'adInfos', 'adInfoModel', 'adModel', 'adModels', 'adModelsUsefull',
  'advertiseChannel', 'advertiseRequest', 'advertiseView', 'advertisementData',
  'advertising', 'advertisingView',
  'floatTopModels', 'floatLayerList', 'floats', 'floatType', 'floatTypeNormal',
  'floatTypeIs916', 'floatView', 'floatWindow', 'floatList', 'floatBall',
  'floatBallView', 'floatingButton', 'floatingList', 'floatingView',
  'marketingView', 'marketingInfo', 'marketingData', 'navMkt', 'navMktInfo', 'navMktModels',
  'commonPopupInfo', 'popupInfo', 'popupInfoDic', 'popUpInfo',
  'popupList', 'popupData', 'popupModel', 'popupModels',
  'liveInfo', 'liveInfoList', 'liveInfoAndProduct', 'liveInfoModel',
  'miniLive', 'miniLiveWindow', 'liveWindow', 'liveSmallWindow',
  'hourlyGoAD', 'hourlyGoAd', 'hourlyGoPopup', 'hourlyGoFloat',
  'couponBall'
]);

// 明确的广告楼层类型，避免误删推荐、商品、活动等正常楼层。
const AD_FLOOR_TYPE = /(^|[^a-z])(ad|ads|advert|advertise|float|popup|popUp|mkt|marketing)([^a-z]|$)/i;

function scrub(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      scrub(item);
    }
    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }
  for (const key of Object.keys(node)) {
    if (DROP_KEYS.has(key)) {
      delete node[key];
      continue;
    }
    scrub(node[key]);
  }
}

function dropAdFloors(container) {
  for (const listKey of ['floors', 'floorList']) {
    const list = container[listKey];
    if (!Array.isArray(list)) {
      continue;
    }
    container[listKey] = list.filter((floor) => {
      if (!floor || typeof floor !== 'object') {
        return true;
      }
      const type = String(floor.type || floor.floorType || floor.templateType || '');
      if (AD_FLOOR_TYPE.test(type)) {
        return false;
      }
      const floorData = floor.data;
      if (floorData && typeof floorData === 'object' && !Array.isArray(floorData)) {
        const keys = Object.keys(floorData);
        if (keys.length > 0 && keys.every((key) => DROP_KEYS.has(key))) {
          return false;
        }
      }
      return true;
    });
  }
}

try {
  scrub(data);
  dropAdFloors(data);

  // 首页欢迎页：旧的搜索框上方消费券楼层。
  if (functionId === 'welcomeHome' && Array.isArray(data.floorList)) {
    data.floorList = data.floorList.filter((item) => !(item && item.iconText));
  }

  // 搜索页：AI 导购与“直播中”标签。
  if (functionId === 'search') {
    if (data.guideShopping) {
      data.guideShopping = {};
    }
    if (Array.isArray(data.wareInfo)) {
      for (const item of data.wareInfo) {
        const shopBefore = item && item.configDatas && item.configDatas.shopBefore;
        if (Array.isArray(shopBefore) && shopBefore[0] && shopBefore[0].describe === '直播中') {
          item.configDatas.shopBefore = [];
        }
      }
    }
  }

  // 商品详情：旧字段兼容，避免个别版本仍下发 liveInfo。
  if (functionId === 'wareBusiness' && Array.isArray(data.floors)) {
    for (const floor of data.floors) {
      if (floor && floor.data && floor.data.liveInfo) {
        floor.data.liveInfo = {};
      }
    }
  }
} catch (e) {
  console.log('jingdong-ads: scrub failed, pass through');
  $done({});
  return;
}

$done({ body: JSON.stringify(data) });
})();
