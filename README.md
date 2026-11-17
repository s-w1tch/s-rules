# s-rules

## Aqara 绿米直连

- [自定义直连名单](rules/s_direct.list) 按域名后缀覆盖 `aqara.com`、`aqara.cn`、`ankasa.cn` 下的官网、账号、各地区 APP SDK、CoAP、开放 API、MQTT、固件/CDN 和视频服务；同时纳入 Lumi 历史域名及韩国官网、支持站点。
- 域名依据：[官方云服务域名表](https://opendoc.aqara.com/en/docs/developmanual/apiIntroduction/APIUsageGuide.html)、[中国官网](https://www.aqara.cn/)、[韩国官网](https://www.aqaralife.kr/)，Lumi 历史域名参考[社区记录](https://github.com/arm-ser/dns-blocklists/blob/main/other)。官网共享云资源仅匹配其专用存储桶，不将整个腾讯云、阿里云或 AWS 域名设为直连；米家兼容设备沿用已有米家规则。
- 该名单覆盖已核实的域名及其子域名，不代表已穷尽所有第三方依赖或直接 IP 连接。发布并更新规则 Provider 后才在客户端生效；QX 需在手机更新分流资源。

## 京东支付兼容

- [自定义直连名单](rules/s_direct.list) 显式覆盖京东购物、支付和金融域名，经模板中的 `🎯 s_direct` 组直连，不依赖国内通用名单是否收录。
- [QX 重写](qx/rewrite.snippet) 将京东业务、支付域名排除在 HTTPS 解密之外，包括广告合集声明的京东 API；保留广告素材图片规则及其他应用的去广告。京东开屏、浮层等接口级去广告不再启用。
- 直连与 HTTPS 解密是独立设置。上述调整用于支付兼容，不代表已确认“不安全网络”的唯一原因；第三方广告资源中的京东域名拦截仍保留。
- 发布后需等 QX 更新 `S-Rules` 重写和 `🎯 s_direct` 分流资源，主配置的 `172800` 秒更新间隔为两天，不保证立即或准时更新。服务器无法读取手机当前命中记录，也不能代验真实支付。