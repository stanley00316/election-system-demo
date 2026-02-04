// 接觸紀錄相關型別定義 (本地副本)

export enum ContactType {
  HOME_VISIT = 'HOME_VISIT',         // 家訪
  STREET_VISIT = 'STREET_VISIT',     // 掃街
  PHONE_CALL = 'PHONE_CALL',         // 電話
  LINE_CALL = 'LINE_CALL',           // LINE 通話
  LIVING_ROOM = 'LIVING_ROOM',       // 客廳會
  FUNERAL = 'FUNERAL',               // 公祭
  WEDDING = 'WEDDING',               // 喜事
  EVENT = 'EVENT',                   // 活動
  MARKETPLACE = 'MARKETPLACE',       // 市場
  TEMPLE = 'TEMPLE',                 // 廟宇
  OTHER = 'OTHER',                   // 其他
}

export enum ContactOutcome {
  POSITIVE = 'POSITIVE',         // 正面
  NEUTRAL = 'NEUTRAL',           // 中立
  NEGATIVE = 'NEGATIVE',         // 負面
  NO_RESPONSE = 'NO_RESPONSE',   // 無回應
  NOT_HOME = 'NOT_HOME',         // 不在家
}
