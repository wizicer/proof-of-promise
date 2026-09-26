# Session 身份连续性问题

## 问题

- 当前系统主要依赖登录 Session 识别用户。
- 用户退出登录或 Session 失效后，系统无法重新定位原账户。
- 用户再次验证时可能被视为新用户，因此看不到之前的借用记录。
- World ID Session 只能证明用户控制某个已保存的 `session_id`，不能自动查询用户原来的应用账户。

## 根因

- 缺少独立于登录 Session 的持久账户身份。
- 没有可靠保存“应用账户 ↔ World `session_id`”的绑定关系。
- 登录前缺少用于定位候选账户的标识，例如随机账户标识、用户名、钱包或恢复码。
- 如果绑定数据丢失，World ID 无法自动恢复原账户关系。

## 初步解决方案

- 建立持久应用账户，不把登录 Session 当作用户身份本身。
- 首次注册时使用固定 uniqueness action，并保存注册 `nullifier`，防止同一真人创建多个账户。这个 action 只用于注册检查，不用于以后登录。
- 注册检查通过后，另外创建并验证 World Session，将 `session_id` 持久绑定到同一个应用账户。
- 为账户生成随机、不可枚举的 `loginHandle`，用于再次登录时定位候选账户。
- 再次登录时读取该账户保存的 `session_id`，执行 `proveSession`，验证返回的 `session_id` 一致后签发新的登录 Session。
- 对账户、`nullifier`、`session_id` 绑定数据进行持久化和备份。

## Action 与 Session 的关系

- Action 和 Session 是两套独立机制，不是 Action 在 World ID 内部创建或包含了一个 Session。
- 注册 Action 产生的 `nullifier` 用于确认“这个真人是否已经注册过”。
- `createSession` 产生的 `session_id` 用于以后确认“这是之前绑定到该账户的同一个 Session”。
- 二者的关联由应用后端保存：同一个应用账户同时记录注册 `nullifier` 和 World `session_id`。
- 注册完成后不再使用该 Action 登录；后续登录使用账户中保存的 `session_id` 执行 `proveSession`，且 Session 请求不传 Action。
- 如果后端丢失账户与 `session_id` 的绑定，注册 Action 无法自动找回原 Session。

```text
首次注册
  uniqueness action -> registration nullifier
  createSession      -> World session_id
  application account 保存两者的绑定

后续登录
  定位 application account
  -> 读取保存的 World session_id
  -> proveSession（不传 Action）
  -> 签发新的应用登录 Session/Cookie
```

## 建议的数据关系

```text
registration nullifier -> application account
loginHandle            -> application account
World session_id       -> application account
login session/cookie   -> temporary authenticated state
```
