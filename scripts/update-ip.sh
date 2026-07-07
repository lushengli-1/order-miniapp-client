#!/bin/bash
# 自动检测本机局域网 IP 并更新小程序配置
# 如果手机预览时出现"网络异常"，先运行此脚本

# 获取本机局域网 IP（排除 127.0.0.1）
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$IP" ]; then
  echo "❌ 未检测到局域网 IP，请检查网络连接"
  exit 1
fi

echo "检测到本机局域网 IP: $IP"

# 更新配置文件
CONFIG_FILE="src/config/index.ts"
sed -i '' "s/DEV_SERVER_HOST = '.*'/DEV_SERVER_HOST = '$IP'/" "$CONFIG_FILE"
sed -i '' "s|API_BASE_URL = \`http://[^:]*|API_BASE_URL = \`http://$IP|" "$CONFIG_FILE"
sed -i '' "s|SERVER_BASE_URL = \`http://[^:]*|SERVER_BASE_URL = \`http://$IP|" "$CONFIG_FILE"

echo "✅ 已更新配置为: $IP"
echo ""
echo "请在微信开发者工具中重新编译预览"
