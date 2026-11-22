// 我嘞个豆 iOS 1.9.1（JS 1.9.22-alpha.46）
const url = $request.url;
let body = JSON.parse($response.body);

if (url.includes('/production/000/version.json')) {
    console.log('-更新弹窗');
    // 不能屏蔽更新：旧 JS 包从 OSS 加载的前端资源会被删除，停留旧版会卡在启动图
    body.autoUpdate = true;
} else if (url.includes('/rpc/fetch_active_announcements')) {
    console.log('-启动弹窗与首页公告');
    body = body.filter(item => !(item.surface || []).some(s => s === 'startup_modal' || s === 'home_banner'));
}
$done({ body: JSON.stringify(body) });
