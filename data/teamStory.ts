import { ImageSourcePropType } from "react-native";

import { images } from "@/constants/images";

// "The Story Behind the App" (Info tab). Wording from the 2026-11-10 revision
// requirements; confirm names, roles and photo permission before publishing.
export type Bilingual = { zh: string; en: string };

export interface TeamMember {
  name: string;
  initials: string;
  /** Shown as tags under the name; the first one is highlighted. */
  roles: Bilingual[];
  /** Left out until it is known. */
  school?: Bilingual;
  quote: Bilingual;
  /** Portrait from constants/images.ts, once the member has approved it. */
  photo?: ImageSourcePropType;
}

export interface PartnerOrg {
  zhName: string;
  enName: string;
  about: Bilingual;
  /** Wide logo shown at the top of the partner card. */
  logo?: ImageSourcePropType;
  /** Pages to follow the partner on (opened in the browser or app). */
  links?: PartnerLink[];
}

export interface PartnerLink {
  label: string;
  url: string;
  icon: "logo-facebook" | "logo-youtube";
}

export const STORY = {
  tagline: {
    zh: "每一段學習旅程的背後，\n都有一群用心付出的人。",
    en: "Behind every learning journey\nis a team that truly cares.",
  },
  title: { zh: "App 背後的故事", en: "The Story Behind\nthe App" } as Bilingual,
  ourStoryLead: { zh: "學習語言，連結文化。", en: "Learning a Language, Connecting Cultures." } as Bilingual,
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
  teamLead: { zh: "四個人，一個共同的願景。", en: "Four minds, one shared vision." } as Bilingual,
  team: [
    {
      name: "郭翊姍 Yishan Kuo",
      initials: "YK",
      photo: images.teamYishan,
      roles: [{ zh: "策劃統籌", en: "Project Planning & Coordination" }],
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
      name: "許慈雯 Wen",
      initials: "W",
      photo: images.teamWen,
      roles: [
        { zh: "華語教師", en: "Chinese Language Teacher" },
        { zh: "學校助教", en: "School Teaching Assistant" },
        {
          zh: "臺北市新住民語文補充教材編輯團隊成員",
          en: "Member of the Editorial Team for the Supplementary Language Textbook for New Residents of Taipei City",
        },
        { zh: "東協人力教育中心專員", en: "Commissioner, ASEAN Human Resources Education Centre" },
      ],
      quote: {
        zh: "熱愛語言教學與多元文化交流，具備華語教學、教育輔導及教材編輯經驗。秉持耐心、尊重與關懷的理念，致力於促進語言學習與跨文化理解。",
        en: "Passionate about language teaching and multicultural communication, with experience in teaching Chinese, educational counseling, and textbook editing. Guided by the principles of patience, respect, and care, she is dedicated to promoting language learning and cross-cultural understanding.",
      },
    },
    {
      name: "萬米山 Wafi",
      initials: "W",
      photo: images.teamWafi,
      roles: [{ zh: "程式設計師", en: "App Developer" }],
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
      photo: images.teamVinsa,
      roles: [{ zh: "協同執行", en: "Project Collaboration" }],
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
    logo: images.logoCertificate,
    links: [
      { label: "Facebook", url: "https://www.facebook.com/hsinchuteach/?locale=zh_TW", icon: "logo-facebook" },
      {
        label: "YouTube",
        url: "https://www.youtube.com/@%E7%AB%B9%E5%B8%82%E7%BF%BB%E8%BD%89%E6%9D%B1%E5%8D%97%E4%BA%9E%E8%AA%9E%E6%96%87%E6%95%B2",
        icon: "logo-youtube",
      },
    ],
    about: {
      zh: "透過教學專業與教育現場的合作，推動印尼語數位學習資源的發展，讓語言學習有更多元的可能。",
      en: "Working with teachers and schools, they champion digital Indonesian learning resources and open up new ways to learn a language.",
    },
  } as PartnerOrg,
  funding: {
    zhName: "國立臺北教育大學東協中心",
    enName: "ASEAN Center, National Taipei University of Education",
    logo: images.partnerAseanCenter,
    about: {
      zh: "感謝提供經費支持，讓印尼語 AI 學習工具的研發與教育創新得以持續推進。",
      en: "Thank you for funding the development of this Indonesian AI learning tool and helping educational innovation move forward.",
    },
  } as PartnerOrg,
  closingTitle: { zh: "用心打造，\n為學習而生。", en: "Made with Heart,\nBuilt for Learning." } as Bilingual,
  closing: {
    zh: "用心研發，讓每一次學習都有更多可能。",
    en: "Built with care, so every lesson opens new possibilities.",
  },
  thanksId: "Terima kasih telah menjadi bagian dari perjalanan ini.",
};
