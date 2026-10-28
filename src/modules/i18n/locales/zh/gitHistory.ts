import type { gitHistory } from "../en/gitHistory";

/** Git 历史：列表表头、加载/空态/错误态、提交详情弹层、文件列表、远程主机链接。 */
export const gitHistoryZh: typeof gitHistory = {
  loadingCommits: "正在加载提交…",
  loadFailed: "无法加载历史记录",
  unknownError: "未知错误",
  retry: "重试",
  noCommits: "暂无提交",
  noCommitsDescription: "此分支还没有提交。",
  header: {
    sha: "SHA",
    subject: "提交信息",
    author: "作者",
    date: "日期",
    changes: "更改",
  },
  loadingMore: "正在加载更多…",
  endOfHistory: "历史记录已到底",
  failedToLoadMore: "加载更多失败",
  noSubject: "（无提交信息）",
  unknownAuthor: "未知",
  filesChanged_one: "更改了 {{count}} 个文件",
  filesChanged_other: "更改了 {{count}} 个文件",
  copied: "已复制",
  copySha: "复制 SHA",
  loadingFiles: "正在加载文件…",
  noFileChanges: "没有文件更改。",
  files: "文件",
  binary: "二进制",
  viewOnGitHub: "在 GitHub 上查看",
  viewOnGitLab: "在 GitLab 上查看",
  viewOnBitbucket: "在 Bitbucket 上查看",
};
