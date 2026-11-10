import { ImageSourcePropType } from "react-native";

// "The Story Behind the App" (Info tab). Wording from the 2026-11-10 revision
// requirements; confirm names, roles and photo permission before publishing.
export type Bilingual = { zh: string; en: string };

export interface TeamMember {
  name: string;
  initials: string;
  role: Bilingual;
  school: Bilingual;
  quote: Bilingual;
  /** Portrait from constants/images.ts, once the member has approved it. */
  photo?: ImageSourcePropType;
}

export interface PartnerOrg {
  zhName: string;
  enName: string;
  about: Bilingual;
}

export const STORY = {
  tagline: {
    zh: "每一段學習旅程的背後，\n都有一群用心付出的人。",
    en: "Behind every learning journey\nis a team that truly cares.",
  },
  ourStoryLead: "Learning a Language, Connecting Cultures.",
  ourStory: [
    {
      zh: "我們相信，語言不只是溝通的工具，更是理解文化、連結彼此的橋梁。",
      en: "We believe a language is more than a tool for talking — it is a bridge to understanding a culture and to each other.",
    },
    {
      zh: "為了讓印尼語學習更貼近真實生活，我們結合語言教學、數位科技與 AI 互動，打造一個能夠聆聽、練習、對話的學習環境。",
      en: "To bring Indonesian closer to real life, we combined language teaching, digital technology and AI conversation into a place where children can listen, practise and talk.",
    },
    {
      zh: "期待每一位學習者，都能從勇敢開口的第一句印尼語開始，逐漸累積自信，感受語言學習的樂趣。",
      en: "We hope every learner starts with a brave first sentence in Indonesian, grows in confidence, and discovers the joy of learning a language.",
    },
  ] as Bilingual[],
  teamLead: "Three minds, one shared vision.",
  team: [
    {
      name: "郭翊姍 Yishan Kuo",
      initials: "YK",
      role: { zh: "策劃統籌", en: "Project Planning & Coordination" },
      school: {
        zh: "國立中央大學\n學習與教學研究所｜博士候選人",
        en: "National Central University\nGraduate Institute of Learning and Instruction | PhD Candidate",
      },
      quote: {
        zh: "從教育現場的需求出發，串連語言教學與 AI 科技，讓創新的想法成為真正能陪伴學習者的工具。",
        en: "Starting from real classroom needs, she links language teaching with AI so new ideas become tools that truly support learners.",
      },
    },
    {
      name: "萬米山 Wafi",
      initials: "W",
      role: { zh: "程式設計師", en: "App Developer" },
      school: {
        zh: "國立陽明交通大學\n資訊工程研究所｜博士生",
        en: "National Yang Ming Chiao Tung University\nInstitute of Computer Science and Engineering | PhD Student",
      },
      quote: {
        zh: "將教學構想轉化為可操作的數位學習功能，透過程式設計與技術研發，建立互動學習體驗。",
        en: "He turns teaching ideas into working app features, building an interactive learning experience through software and research.",
      },
    },
    {
      name: "文莎 Vinsa",
      initials: "V",
      role: { zh: "協同執行", en: "Project Collaboration" },
      school: {
        zh: "國立中央大學\n網路學習科技研究所｜博士生",
        en: "National Central University\nGraduate Institute of Network Learning Technology | PhD Student",
      },
      quote: {
        zh: "參與研發協作，連結教育理念與數位學習應用，共同完善學習內容與使用體驗。",
        en: "She connects educational ideas with digital learning, helping to refine the lessons and the experience of using the app.",
      },
    },
  ] as TeamMember[],
  implementation: {
    zhName: "新竹市新住民語文輔導團",
    enName: "Hsinchu City New Immigrant Languages Advisory Group",
    about: {
      zh: "透過教學專業與教育現場的合作，推動印尼語數位學習資源的發展，讓語言學習有更多元的可能。",
      en: "Working with teachers and schools, they champion digital Indonesian learning resources and open up new ways to learn a language.",
    },
  } as PartnerOrg,
  funding: {
    zhName: "國立臺北教育大學東協中心",
    enName: "ASEAN Center, National Taipei University of Education",
    about: {
      zh: "感謝提供經費支持，讓印尼語 AI 學習工具的研發與教育創新得以持續推進。",
      en: "Thank you for funding the development of this Indonesian AI learning tool and helping educational innovation move forward.",
    },
  } as PartnerOrg,
  closing: {
    zh: "用心研發，讓每一次學習都有更多可能。",
    en: "Built with care, so every lesson opens new possibilities.",
  },
  thanksId: "Terima kasih telah menjadi bagian dari perjalanan ini.",
};
