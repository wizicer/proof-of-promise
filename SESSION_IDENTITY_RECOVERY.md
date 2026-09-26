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
- 将固定 action 配置为允许重复验证；action 只创建一次，用户可以多次执行验证。
- 每次登录都验证同一个 action，并用稳定的 action-scoped `nullifier` 查询应用账户。
- 查询不到账户时才首次注册；查询到时直接为原账户签发新的应用登录 Session。
- 对账户与 `nullifier` 的绑定数据进行持久化和备份，并保证 nullifier 唯一。

## Action 与 Session 的关系

- Action 和 Session 是两套独立机制，不是 Action 在 World ID 内部创建或包含了一个 Session。
- 固定 Action 产生的稳定 `nullifier` 是应用账户的 World ID 身份锚点。
- World Session 和应用 Cookie 都只是临时会话，不作为账户主键，也不负责找回账户。
- 同一个人重复验证固定 Action 时，后端必须按 `nullifier` 返回同一个应用账户，不能新建账户。
- 一人一账户由 nullifier 的唯一约束和原子 find-or-create 保证，而不是由浏览器本地数据保证。

```text
每次登录
  fixed identity action -> stable nullifier
  -> 按 nullifier 原子查询或创建 application account
  -> 签发新的应用登录 Session/Cookie
  -> Activity 始终按 application account 查询
```

## 建议的数据关系

```text
identity action nullifier -> application account（唯一）
login session/cookie      -> temporary authenticated state
```
