# 🚀 排行榜数据持久化 - 紧急修复指南

## ❗ 问题说明

你遇到的问题：**服务器重启后排行榜数据丢失**

**根本原因**：`leaderboard.json` 之前被 Git 跟踪，每次部署时 `git pull` 会用仓库中的旧文件覆盖运行时生成的数据。

## ✅ 已完成的修复

1. ✅ 将 `server/leaderboard.json` 添加到 `.gitignore`
2. ✅ 创建了 `server/leaderboard.example.json` 作为模板
3. ✅ 创建了详细的部署文档

## 🔧 需要你执行的步骤

### 步骤 1：从 Git 中移除 leaderboard.json

**重要**：这个命令只会从 Git 版本控制中移除文件，**不会删除本地文件**！

```bash
# 在项目根目录执行
git rm --cached server/leaderboard.json
```

### 步骤 2：提交更改

```bash
git add .gitignore server/leaderboard.example.json server/README.md
git commit -m "修复: 排行榜数据持久化问题 - 移除数据文件的版本控制"
git push
```

### 步骤 3：在生产服务器上更新

**如果你已经在生产服务器上部署了**，执行以下步骤：

```bash
# 1. 先备份当前的排行榜数据（重要！）
cp server/leaderboard.json server/leaderboard.backup.json

# 2. 拉取最新代码
git pull

# 3. 如果 git pull 提示冲突，执行：
git checkout --theirs server/leaderboard.json  # 保留服务器上的文件
# 或者直接恢复备份：
cp server/leaderboard.backup.json server/leaderboard.json

# 4. 重启服务器
npm start
# 或者如果使用 PM2：
pm2 restart mountain-tour
```

## 📋 验证修复是否成功

### 测试流程：

1. **记录当前排行榜数据**
   ```bash
   cat server/leaderboard.json
   ```

2. **玩一局游戏并查看排行榜是否更新**

3. **重启服务器**
   ```bash
   # 停止服务器（Ctrl+C）
   # 然后重新启动
   npm start
   ```

4. **检查数据是否还在**
   ```bash
   cat server/leaderboard.json
   ```

5. **测试代码更新**
   ```bash
   # 假设修改一个无关文件
   touch test-file.txt
   git add test-file.txt
   git commit -m "测试提交"
   git push
   
   # 在服务器上
   git pull
   
   # 检查 leaderboard.json 是否被覆盖
   cat server/leaderboard.json  # 数据应该还在！
   ```

## 🎯 未来部署流程

从现在开始，每次更新部署只需要：

```bash
git pull          # 拉取代码更新
npm install       # 安装新依赖（如果有）
npm run build     # 重新构建前端
npm start         # 重启服务器（或 pm2 restart）
```

**排行榜数据会自动保留！** 🎉

## 🛡️ 额外安全建议

### 自动备份脚本

创建一个定时备份脚本 `server/backup-leaderboard.sh`：

```bash
#!/bin/bash
BACKUP_DIR="server/backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp server/leaderboard.json $BACKUP_DIR/leaderboard_$TIMESTAMP.json

# 只保留最近 30 个备份
ls -t $BACKUP_DIR/leaderboard_*.json | tail -n +31 | xargs -r rm
echo "Backup created: leaderboard_$TIMESTAMP.json"
```

**使用 crontab 每天自动备份**：

```bash
# 添加定时任务
crontab -e

# 添加这一行（每天凌晨 2 点备份）
0 2 * * * /path/to/mountain_tour/server/backup-leaderboard.sh
```

## 🆘 常见问题

### Q: 我已经在生产环境运行了，会丢失当前数据吗？

**A**: 不会！只要执行上面的"步骤 3"，先备份数据文件，更新代码后恢复即可。

### Q: 如果我不小心执行了 `git pull` 覆盖了数据怎么办？

**A**: 如果有备份文件，直接恢复：
```bash
cp server/leaderboard.backup.json server/leaderboard.json
```

### Q: 我能看到 Git 提交历史中的旧排行榜数据吗？

**A**: 可以。虽然我们从 Git 中移除了文件，但历史记录中仍然保留。如果需要完全清除历史（不推荐），需要使用 `git filter-branch`。

## 📞 技术支持

如果遇到问题，请检查：
1. `.gitignore` 中是否包含 `server/leaderboard.json`
2. 执行 `git status`，确认 `leaderboard.json` 不在跟踪列表中
3. 查看服务器日志，确认是否有 `[Leaderboard] Saved` 的消息

---

**修复完成后，你的排行榜数据将永久保留！** 🏆
