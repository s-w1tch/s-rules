// 我嘞个豆 iOS 1.9.1（JS 1.9.22-alpha.46）
const url = $request.url;
let body = JSON.parse($response.body);

if (url.includes('/production/000/version.json')) {
    console.log('-更新弹窗');
    // 不能屏蔽更新：旧 JS 包从 OSS 加载的前端资源会被删除，停留旧版会卡在启动图
    body.autoUpdate = true;
} else if (url.includes('/rpc/fetch_my_monthly_cards')) {
    console.log('-开屏广告');
    const expiresAt = '2999-12-31T00:00:00+00:00';
    const card = (body || []).find(item => item.plan_id === 'splash_ad_free');
    if (card) {
        card.status = 'active';
        card.expires_at = expiresAt;
        card.remaining_seconds = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
    } else {
        console.log('-未找到 splash_ad_free，未改动');
    }
} else if (url.includes('/rpc/fetch_active_announcements')) {
    console.log('-启动弹窗与首页公告');
    body = body.filter(item => !(item.surface || []).some(s => s === 'startup_modal' || s === 'home_banner'));
}
$done({ body: JSON.stringify(body) });
