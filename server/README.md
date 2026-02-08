# 服务器部署说明

## 排行榜数据持久化

### 重要提示 ⚠️

`leaderboard.json` 是运行时数据文件，用于存储游戏排行榜。该文件：

- ✅ **已被 Git 忽略**（在 `.gitignore` 中）
- ✅ **不应该被版本控制跟踪**
- ✅ **部署时会自动创建**（如果不存在）

### 首次部署

1. 克隆代码并安装依赖：
```bash
git clone <your-repo>
cd mountain_tour
npm install
```

2. 构建前端：
```bash
npm run build
```

3. 启动服务器：
```bash
npm start
```

服务器会自动创建空的 `leaderboard.json` 文件。

### 更新部署

**正确的更新流程**：

```bash
# 1. 拉取最新代码
git pull

# 2. 安装新依赖（如果有）
npm install

# 3. 重新构建前端
npm run build

# 4. 重启服务器
npm start
```

**注意**：`leaderboard.json` 不会被 `git pull` 覆盖，因为它已在 `.gitignore` 中！

### 数据备份建议

为了安全起见，建议定期备份排行榜数据：

```bash
# 创建备份
cp server/leaderboard.json server/leaderboard.backup.json

# 或使用时间戳
cp server/leaderboard.json server/leaderboard.$(date +%Y%m%d_%H%M%S).json
```

### 恢复数据

如果数据意外丢失，从备份恢复：

```bash
cp server/leaderboard.backup.json server/leaderboard.json
```

### 数据文件位置

- **运行时数据**：`server/leaderboard.json` ← 实际使用的文件
- **示例模板**：`server/leaderboard.example.json` ← 仅供参考

### 清空排行榜

如果需要重置排行榜：

```bash
echo "[]" > server/leaderboard.json
# 或
rm server/leaderboard.json  # 服务器重启时会自动创建空文件
```

## 生产环境建议

### 使用 PM2 管理进程

为了保证服务稳定运行，建议使用 PM2：

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/index.js --name mountain-tour

# 开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs mountain-tour

# 重启服务
pm2 restart mountain-tour
```

### 使用数据库（可选升级）

如果游戏规模扩大，可以考虑将排行榜数据迁移到数据库（如 MongoDB、PostgreSQL 等）。

## 故障排查

### 问题：重启后排行榜消失

**可能原因**：
1. `leaderboard.json` 被 Git 跟踪并在部署时被覆盖
2. 文件权限问题，服务器无法写入

**解决方案**：
1. 确认 `.gitignore` 中包含 `server/leaderboard.json`
2. 检查文件权限：`ls -la server/leaderboard.json`
3. 查看服务器日志，确认是否有保存成功的消息

### 问题：数据没有保存

检查服务器日志中是否有以下信息：

```
[Leaderboard] Saved X entries to /path/to/leaderboard.json
```

如果没有，可能是游戏没有正确结束或没有达到保存条件。

## 联系支持

如有问题，请检查 `server/index.js` 中的日志输出。
