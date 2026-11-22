// 我嘞个豆 iOS 1.9.1（JS 1.9.21-alpha.7）
const url = $request.url;
let body = JSON.parse($response.body);

if (url.includes('/production/000/flags.json')) {
    console.log('-开屏广告与激励视频');
    // 审核开关仅在 storeReviewMinShell 不高于原生壳版本时生效；未声明的开关默认 true，需全部显式给值
    body.storeReviewMinShell = Object.assign({}, body.storeReviewMinShell, { ios: '0.0.0' });
    body.storeReviewSwitches = Object.assign({}, body.storeReviewSwitches, {
        ios: {
            homeOfficialOnly: false,
            applePayOnly: false,
            hideDrama: false,
            hideAdReward: true,
            hideSplashAd: true,
            hidePurchase: false,
            hideMembership: false,
            hideWithdraw: false,
            hideBeadMap: false
        }
    });
} else if (url.includes('/production/000/version.json')) {
    console.log('-更新弹窗');
    body.version = '0.0.0';
    body.autoUpdate = false;
} else if (url.includes('/rpc/fetch_active_announcements')) {
    console.log('-启动弹窗与首页公告');
    body = body.filter(item => !(item.surface || []).some(s => s === 'startup_modal' || s === 'home_banner'));
}
$done({ body: JSON.stringify(body) });
