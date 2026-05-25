export type OfficerId = "yuri" | "gu" | "lin";

export interface Officer {
  id: OfficerId;
  name: string;
  title: string;
  color: string;
  bgClass: string;
  slogan: string;
  quotes: {
    idle: string;
    working: string;
    warning: string;
  };
}

export const OFFICERS: Officer[] = [
  {
    id: "yuri",
    name: "尤里教官",
    title: "钢铁纪律·惩戒室主任",
    color: "#F15A24",
    bgClass: "bg-orange-500",
    slogan: "摸鱼是对时间和自己灵魂的无耻背叛，列兵！",
    quotes: {
      idle: "做得很优秀，列兵！继续保持高昂的专注状态！",
      working: "时间正在一秒秒蒸发！全神贯注！不可懈怠！",
      warning: "警告！列兵！你以为你在钓鱼吗？立刻放下多余的手机模块，目光回到书桌前！",
    },
  },
  {
    id: "gu",
    name: "顾姐",
    title: "冷酷特工·前任毒舌学姐",
    color: "#D946EF",
    bgClass: "bg-fuchsia-500",
    slogan: "真意外，你那可怜的脑容量竟然可以让眼神停留十分钟不看手机。",
    quotes: {
      idle: "哼，难得看你静下来哪怕一会儿，勉强算你及格吧。",
      working: "哎呀呀，写得真慢。要不要顾姐亲手教你什么叫效率？",
      warning: "抓包了哦，小家伙。是考研题太简单，还是觉得你下半辈子能靠摸鱼发家致富？",
    },
  },
  {
    id: "lin",
    name: "林风师兄",
    title: "治愈阳光·暖流加油站",
    color: "#10B981",
    bgClass: "bg-emerald-500",
    slogan: "别着急，每学完一节我就在图书馆拐角给你做热生椰拿铁。",
    quotes: {
      idle: "没关系的，深呼吸，这一步走得很扎实，你真的很棒了。",
      working: "学累了吗？来，再坚持这最后的15分钟，我一直在这陪你。",
      warning: "哎呀呀，怎么走神了？说好这半小时一起跟困难死磕的，不许丢下我一个人看手机哦！",
    },
  },
];
