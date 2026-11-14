export type OHLC = [number, number, number, number]; // [Open, High, Low, Close] on 0-100 scale
export type PatternBias = 'bullish' | 'bearish' | 'neutral';
export type PatternRole = 'Reversal' | 'Continuation' | 'Indecision';
export type TrendRequirement = 'down' | 'up' | 'any';
export type ChanceLevel = 'Low' | 'Medium' | 'High';

export interface NextCandleOutcome {
  name: string;
  meaningHinglish: string;
  actionHinglish: string;
}

export interface PatternDefinition {
  id: number;
  name: string;
  bias: PatternBias;
  role: PatternRole;
  trendBefore: TrendRequirement;
  candles: OHLC[];
  hasGap?: boolean;
  howItFormsHinglish: string;
  whatItTellsHinglish: string;
  bullishChance: ChanceLevel;
  bearishChance: ChanceLevel;
  chancesReasonHinglish: string;
  nextIfConfirmed: NextCandleOutcome;
  nextIfFails: NextCandleOutcome;
  whenWorksHinglish: string;
}

export const PATTERN_LIBRARY: PatternDefinition[] = [
  // ================= BULLISH (1 - 21) =================
  {
    id: 1,
    name: 'Bullish Engulfing',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [
      [60, 62, 52, 54],
      [52, 70, 50, 68],
    ],
    howItFormsHinglish:
      'Pehli chhoti red candle banti hai, phir doosri badi green candle pichli candle ki poori body (open-close hissa) ko nigal leti hai.',
    whatItTellsHinglish:
      'Pehle sellers aage the, par doosri candle mein buyers ne zor se control chheen liya.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Jab green candle poori red body cover kare to buying strength mazboot hoti hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Marubozu / Bullish Candle',
      meaningHinglish: 'Buyers follow-through (aage bhi kharidari) dikha rahe hain.',
      actionHinglish: 'Pattern high ke upar close milne par bullish setup valid maana jata hai.',
    },
    nextIfFails: {
      name: 'Bearish Engulfing / Bearish Candle',
      meaningHinglish: 'Buyers upar tik nahi paaye aur sellers wapas haavi ho gaye.',
      actionHinglish: 'Agar price pattern low ke neeche close de to setup fail (stop-loss hit) ho jata hai.',
    },
    whenWorksHinglish:
      'Downtrend (girawat) ke baad strong support (neeche ka sahara) ke paas best kaam karta hai; sideways range mein fail ho sakta hai.',
  },
  {
    id: 2,
    name: 'Hammer',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [[38, 41, 15, 40]],
    howItFormsHinglish:
      'Upar chhoti body aur neeche body se kam se kam 2 guna lambi wick (patli dandi) banti hai, bilkul hathode jaisi.',
    whatItTellsHinglish:
      'Sellers ne price ko neeche dhakela, par buyers ne wahan se strong kharidari karke price ko wapas upar kheench liya.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Neeche se lambi rejection wick dikhati hai ki demand zone active hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers hammer ke high ko tod kar price upar le ja rahe hain.',
      actionHinglish: 'Hammer high ke upar closing par upmove shuru hone ka chance badhta hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Neeche ka support toot gaya aur sellers phir se control mein hain.',
      actionHinglish: 'Hammer ke low ke neeche close aane par bullish idea toot jata hai.',
    },
    whenWorksHinglish:
      'Sirf clear downtrend (girawat) ke neeche aur support line par effective hota hai; bina girawat ke beech mein weak hota hai.',
  },
  {
    id: 3,
    name: 'Morning Star',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    hasGap: true,
    candles: [
      [80, 82, 58, 60],
      [54, 56, 48, 52],
      [56, 80, 54, 78],
    ],
    howItFormsHinglish:
      '3 candles: pehli badi red, beech mein chhoti pause/star candle (thoda gap ya neeche), teesri badi green jo pehli ke 50% se upar close ho.',
    whatItTellsHinglish:
      'Girawat ki raftaar pehle ruki (2nd candle) aur teesri candle mein buyers ne naya uptrend shuru kar diya.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      '3-candle confirmation ki wajah se reliable reversal pattern hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle / Three White Soldiers',
      meaningHinglish: 'Uptrend momentum (upar ki raftaar) lagatar badh raha hai.',
      actionHinglish: '3rd candle high ke upar close milne par buying momentum continue ho sakta hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Star ka bottom support toot gaya aur downtrend jaari hai.',
      actionHinglish: 'Middle star candle ke low ke neeche close par setup invalid hota hai.',
    },
    whenWorksHinglish:
      'Tez girawat ke baad major support par acha kaam karta hai; agar 3rd candle chhoti ho to signal kamzor rehta hai.',
  },
  {
    id: 4,
    name: 'Piercing Line',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [
      [80, 82, 58, 60],
      [54, 76, 52, 72],
    ],
    howItFormsHinglish:
      'Pehli lambi red candle ke baad doosri green candle pichle close se neeche open hoti hai aur red body ke 50% se upar close deti hai.',
    whatItTellsHinglish:
      'Subah/start mein sellers ne pressure banaya par buyers ne aadhe se zyada girawat recover kar li.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Bullish reversal shuru hua hai par Engulfing se thoda kamzor hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ab 1st candle ka high paar karne ki tayyari mein hain.',
      actionHinglish: '2nd candle high ke upar agli green candle close ka intezar karein.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Recovery sirf bounce thi aur sellers ne wapas neeche dhakela.',
      actionHinglish: '2nd candle low ke neeche close par bullish bias khatam hota hai.',
    },
    whenWorksHinglish:
      'Downtrend ke bottom par jab volume badhe tab strong hota hai; agar 50% se kam recover kare to fail maana jata hai.',
  },
  {
    id: 5,
    name: 'Bullish Harami',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [
      [80, 82, 58, 60],
      [66, 74, 64, 72],
    ],
    howItFormsHinglish:
      'Pehli badi red candle ke andar doosri chhoti green candle poori tarah sama jati hai.',
    whatItTellsHinglish:
      'Lambi girawat ke baad selling pressure thak gaya hai aur market ruk kar palatne ki soch raha hai.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Yeh 2-candle pause hai isliye confirmation bahut zaroori hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Pause ke baad buyers ne upar breakout (rukawat todna) diya.',
      actionHinglish: '1st candle ke open/high ke upar close par reversal confirm hota hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Yeh sirf chhota aaram tha, girawat dubara shuru ho gayi.',
      actionHinglish: '1st candle ke low ke neeche close par stop-loss trigger hota hai.',
    },
    whenWorksHinglish:
      'Strong downtrend ke baad support par kaam karta hai; choppy market mein aksar range banakar atak jata hai.',
  },
  {
    id: 6,
    name: 'Three White Soldiers',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [
      [40, 56, 38, 54],
      [48, 70, 46, 68],
      [62, 84, 60, 82],
    ],
    howItFormsHinglish:
      'Lagatar 3 badi green candles banti hain, har ek pichli body ke andar open hoke naye high ke paas close hoti hai.',
    whatItTellsHinglish:
      'Buyers bina kisi rukawat ke har candle mein control badha rahe hain — tez kharidari ka sanket.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Teeno candles mein strong body dikhti hai; agar resistance paas ho to chhote pullback aur confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Doji / Spinning Top then Bullish Candle',
      meaningHinglish: 'Thoda sa saans lene (pullback) ke baad uptrend jaari.',
      actionHinglish: 'Chhote pullback par support hold karne ke baad trend follow karte hain.',
    },
    nextIfFails: {
      name: 'Shooting Star / Bearish Engulfing',
      meaningHinglish: '3 lambi candles ke baad buyers thak gaye (exhaustion) aur profit booking aayi.',
      actionHinglish: 'Teesri candle ke low ke neeche close par reversal alert milta hai.',
    },
    whenWorksHinglish:
      'Consolidation ya downtrend ke end mein bahut mazboot; par agar candles bahut zyada badi hon to turant chasing risky hoti hai.',
  },
  {
    id: 7,
    name: 'Inverted Hammer',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [[40, 68, 39, 44]],
    howItFormsHinglish:
      'Neeche chhoti body aur upar 2 guna se zyada lambi wick banti hai, neeche lagbhag koi wick nahi hoti.',
    whatItTellsHinglish:
      'Buyers ne candle ke dauran upar le jane ki pehli badi koshish ki; abhi sellers ne roka par base ban raha hai.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Akele ye sirf koshish dikhata hai, agli candle decide karegi; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne pichli koshish ko sach kar dikhaya aur upar close diya.',
      actionHinglish: 'Inverted Hammer high ke upar close par reversal confirm hota hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Upar ka rejection sahi nikla aur sellers ne price aur giraya.',
      actionHinglish: 'Low ke neeche close aane par pattern fail maana jata hai.',
    },
    whenWorksHinglish:
      'Sirf downtrend ke bottom par support ke paas kaam karta hai; bina confirmation entry risky hoti hai.',
  },
  {
    id: 8,
    name: 'Dragonfly Doji',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [[50, 51, 25, 50]],
    howItFormsHinglish:
      'Open, High aur Close lagbhag ek hi upari level par hote hain aur neeche bahut lambi wick banti hai (T shape).',
    whatItTellsHinglish:
      'Sellers ne poori taqat se neeche giraya par closing tak buyers ne 100% recovery kar li.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Zero body ke saath poori recovery strong demand dikhati hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ab opening ke baad upar breakout de rahe hain.',
      actionHinglish: 'Doji high ke upar green close par buying strength confirm hoti hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Lambi neeche wali wick ka support toot gaya.',
      actionHinglish: 'Doji ke low ke neeche close par setup toot jata hai.',
    },
    whenWorksHinglish:
      'Support level par downtrend ke end mein shandar reversal signal deta hai.',
  },
  {
    id: 9,
    name: 'Bullish Abandoned Baby',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    hasGap: true,
    candles: [
      [80, 82, 58, 60],
      [50, 53, 47, 50],
      [62, 85, 60, 82],
    ],
    howItFormsHinglish:
      'Lambi red candle ke baad gap-down (khalis jagah chhodkar) ek Doji banti hai, phir gap-up ke saath badi green candle upar bhagti hai.',
    whatItTellsHinglish:
      'Achanak sentiment poori tarah badal gaya — sellers trap (phans) ho gaye aur buyers haavi ho gaye.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Rare par high-probability gap reversal pattern hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Gap hold ho raha hai aur buyers rally ko aage badha rahe hain.',
      actionHinglish: 'Gap zone support ki tarah kaam karta hai jab tak price iske upar rahe.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Price wapas neeche aakar gap ko bhar (fill) raha hai.',
      actionHinglish: 'Middle Doji ke low ke neeche close par pattern fail ho jata hai.',
    },
    whenWorksHinglish:
      'Real gap wale charts (1D ya market open) par powerful hota hai; continuous intraday chart par zabardasti na dhoondhein.',
  },
  {
    id: 10,
    name: 'Three Inside Up',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [
      [80, 82, 58, 60],
      [62, 76, 60, 74],
      [74, 90, 72, 88],
    ],
    howItFormsHinglish:
      'Pehle Bullish Harami banti hai (badi red + chhoti green), phir teesri green candle pehli red candle ke open se upar close hoti hai.',
    whatItTellsHinglish:
      'Harami ka reversal ab teesri candle se confirm ho chuka hai aur buyers control mein hain.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Isme 3rd candle khud confirmation le kar aati hai; phir bhi follow-through candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Breakout ke baad naye buyers jud rahe hain.',
      actionHinglish: '3rd candle ke high ke upar uptrend smoothly chal sakta hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Upar resistance se price turant reject ho gaya.',
      actionHinglish: '2nd candle ke low ke neeche close par setup kamzor pad jata hai.',
    },
    whenWorksHinglish:
      'Clear downtrend ke baad support ke paas high reliability deta hai.',
  },
  {
    id: 11,
    name: 'Three Outside Up',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [
      [60, 62, 52, 54],
      [52, 70, 50, 68],
      [68, 80, 66, 78],
    ],
    howItFormsHinglish:
      'Pehle Bullish Engulfing banti hai (red + usko nigalti green), phir teesri green candle aur upar close karti hai.',
    whatItTellsHinglish:
      'Buyers ne na sirf control liya balki agli candle mein bhi taqat barkarar rakhi.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Engulfing + confirmation dono ek saath hone se strong bullish signal banta hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Uptrend ki shuruwat mazboot hai aur buyers aggressive hain.',
      actionHinglish: '3rd candle high ke upar momentum continue reh sakta hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Tez uchaal ke baad profit booking aa gayi.',
      actionHinglish: '2nd candle low ke neeche close par stop-loss logic toot jata hai.',
    },
    whenWorksHinglish:
      'Downtrend reversal mein bahut solid; bas upar turant koi major resistance na ho.',
  },
  {
    id: 12,
    name: 'Bullish Kicker',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    hasGap: true,
    candles: [
      [70, 72, 58, 60],
      [74, 98, 72, 96],
    ],
    howItFormsHinglish:
      'Red candle ke baad agle hi pal achanak gap-up (khalis jagah upar) ke saath badi green candle upar bhagti hai.',
    whatItTellsHinglish:
      'Kisi achi khabar ya bade buyers ki entry se market ka mood achanak bearish se bullish palat gaya.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Sabse tez reversal signals mein se ek hai; par gap-up ke baad chhota confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Marubozu / Bullish Candle',
      meaningHinglish: 'Buyers har dip par kharidari kar rahe hain.',
      actionHinglish: '2nd candle ke high ke upar tez rally aa sakti hai.',
    },
    nextIfFails: {
      name: 'Doji then Bearish Candle',
      meaningHinglish: 'Gap fill (gap bharna) shuru ho gaya aur uchaal fake nikla.',
      actionHinglish: 'Agar price 2nd candle ke open se neeche gire to bullish setup fail.',
    },
    whenWorksHinglish:
      'Market open par gap-up ya daily charts par jab asli gap dikhe tabhi count hota hai.',
  },
  {
    id: 13,
    name: 'Tweezer Bottom',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [
      [70, 72, 50, 52],
      [52, 68, 50, 66],
    ],
    howItFormsHinglish:
      '2 candles (pehli red, doosri green) jinke low bilkul ek hi price level par rukte hain — chhoti si chhoti chikni zameen jaisi.',
    whatItTellsHinglish:
      'Sellers ne do baar usi level ko todne ki koshish ki, par dono baar buyers ne deewar ki tarah price bacha liya.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Double rejection neeche ek pakka floor (support) dikhata hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Support pakka hone ke baad price upar nikal raha hai.',
      actionHinglish: 'Dono candles ke high ke upar close par uptrend shuru ho sakta hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Matched support level aakhirkar toot gaya.',
      actionHinglish: 'Common low ke neeche close par setup turant fail ho jata hai.',
    },
    whenWorksHinglish:
      'Support line ya day low ke paas downtrend ke baad sabse zyada reliable hota hai.',
  },
  {
    id: 14,
    name: 'Rising Three Methods',
    bias: 'bullish',
    role: 'Continuation',
    trendBefore: 'up',
    candles: [
      [40, 72, 38, 70],
      [68, 69, 62, 63],
      [63, 64, 56, 57],
      [57, 58, 50, 51],
      [52, 86, 50, 84],
    ],
    howItFormsHinglish:
      'Ek badi green candle, uske range ke andar 3 chhoti red candles (halka aaram), phir 5vi badi green candle jo pehli candle ke high ke upar close de.',
    whatItTellsHinglish:
      'Uptrend mein chhoti profit booking aayi par sellers price ko neeche nahi le ja paaye — buyers dubara aage badh gaye.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Textbook trend-continuation breakout hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Uptrend bina rukawat naye highs ki taraf badh raha hai.',
      actionHinglish: 'Breakout candle ke high ke upar trend riding jaari rehti hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Breakout fail hokar fakeout (jhoota breakout) ban gaya.',
      actionHinglish: 'Pehli candle ke low ke neeche close par uptrend kamzor ho jata hai.',
    },
    whenWorksHinglish:
      'Strong chalte hue uptrend ke beech mein bahut reliable continuation signal hai.',
  },
  {
    id: 15,
    name: 'Concealing Baby Swallow',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    hasGap: true,
    candles: [
      [80, 82, 62, 64],
      [64, 66, 46, 48],
      [40, 43, 37, 41],
      [44, 45, 30, 32],
    ],
    howItFormsHinglish:
      '2 lambi red candles, teesri gap-down chhoti candle (upar wick ke saath), aur chauthi badi red candle jo teesri ko cover kar leti hai.',
    whatItTellsHinglish:
      'Aakhiri red candle ke baad sellers poori tarah thak chuke hote hain (panic selling climax) aur buyers entry ko taiyar hain.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Charon candles red dikhti hain isliye bina agli green candle ke risk high hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle / Hammer',
      meaningHinglish: 'Selling climax ke baad asli buyers aage aa gaye.',
      actionHinglish: 'Agli mazboot green candle close hone tak intezar karna zaroori hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Panic selling aur gehri ho gayi.',
      actionHinglish: '4th candle ke low ke neeche close par neeche ka trend jaari rehta hai.',
    },
    whenWorksHinglish:
      'Lambi girawat ke baad rare pattern hai; sirf clear green confirmation ke baad hi maanyata dein.',
  },
  {
    id: 16,
    name: 'Mat Hold',
    bias: 'bullish',
    role: 'Continuation',
    trendBefore: 'up',
    hasGap: true,
    candles: [
      [40, 72, 38, 70],
      [72, 74, 66, 67],
      [67, 69, 62, 63],
      [63, 65, 60, 61],
      [62, 90, 60, 88],
    ],
    howItFormsHinglish:
      'Uptrend mein lambi green candle ke baad 3 chhoti red candles upar ke hisse mein ruki rehti hain, phir 5vi badi green breakout deti hai.',
    whatItTellsHinglish:
      'Sellers itne kamzor hain ki pullback pehli green candle ke aadhe se neeche bhi nahi aa paaya.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Shallow pullback dikhata hai ki buyers control mein hain; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Naya high banakar uptrend aur tez ho raha hai.',
      actionHinglish: '5vi candle high ke upar momentum continue ho sakta hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Breakout tik nahi paaya aur sellers active ho gaye.',
      actionHinglish: 'Pehli candle ke low ke neeche close par bullish structure toot jata hai.',
    },
    whenWorksHinglish:
      'Strong uptrend ke beech jab volume breakout par badhe tab best kaam karta hai.',
  },
  {
    id: 17,
    name: 'Bullish Separating Lines',
    bias: 'bullish',
    role: 'Continuation',
    trendBefore: 'up',
    candles: [
      [66, 68, 50, 52],
      [66, 88, 64, 86],
    ],
    howItFormsHinglish:
      'Uptrend mein ek red candle banti hai, par agli green candle pichli red candle ke open level se hi shuru hoke tez upar close deti hai.',
    whatItTellsHinglish:
      'Ek candle ke liye sellers aaye the par buyers ne usi shuruwati point se price ko wapas upar khinch liya.',
    bullishChance: 'Medium',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Uptrend ki taqat wapas aa gayi hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ka momentum lagatar jaari hai.',
      actionHinglish: '2nd candle high ke upar trend continuation pakka hota hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Upar se sellers wapas pressure daal rahe hain.',
      actionHinglish: '2nd candle open ke neeche close par setup kamzor pad jata hai.',
    },
    whenWorksHinglish:
      'Chalte hue uptrend ke beech mein hi continuation maana jata hai.',
  },
  {
    id: 18,
    name: 'Bullish Belt Hold',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [[30, 60, 30, 58]],
    howItFormsHinglish:
      'Downtrend ke baad single green candle apne din/period ke bilkul low se open hoke bina lower wick ke high ke paas close deti hai.',
    whatItTellsHinglish:
      'Open hote hi buyers ne poori taqat laga di aur ek baar bhi sellers ko neeche jaane ka mauka nahi diya.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Single strong candle hai par confirmation chahiye; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers agle candle mein bhi control hold kar rahe hain.',
      actionHinglish: 'Is candle ke high ke upar close milne par rally pakki hoti hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Ek-candle ka josh thanda pad gaya aur girawat wapas aayi.',
      actionHinglish: 'Is candle ke low ke neeche close par idea fail hota hai.',
    },
    whenWorksHinglish:
      'Girawat ke baad support par bane aur size mein badi ho tab acha kaam karta hai.',
  },
  {
    id: 19,
    name: 'Bullish Three-Line Strike',
    bias: 'bullish',
    role: 'Continuation',
    trendBefore: 'up',
    candles: [
      [40, 52, 38, 50],
      [50, 64, 48, 62],
      [62, 76, 60, 74],
      [78, 80, 34, 36],
    ],
    howItFormsHinglish:
      '3 chhoti/medium green candles upar jaati hain, phir ek 4th badi red candle teeno ke low ke neeche close de deti hai (shakeout).',
    whatItTellsHinglish:
      'Aksar badi red candle kamzor buyers ko darane (stop-loss hunt) ke liye banti hai, uske baad uptrend phir shuru ho sakta hai.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      '4th candle badi red hoti hai isliye dhyan rakhna zaroori hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Price 4th candle ke high ko reclaim (wapas haasil) kar raha hai.',
      actionHinglish: '4th red candle ke high ke upar strong green close par hi bullish maanein.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: '4th red candle asli reversal thi, shakeout nahi.',
      actionHinglish: '4th candle ke low ke neeche girne par uptrend khatam maana jata hai.',
    },
    whenWorksHinglish:
      'Risky/advanced pattern hai; bina agle bullish confirmation ke entry bilkul na lein.',
  },
  {
    id: 20,
    name: 'Ladder Bottom',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    candles: [
      [80, 82, 66, 68],
      [70, 72, 56, 58],
      [60, 62, 46, 48],
      [46, 56, 40, 42],
      [48, 72, 46, 70],
    ],
    howItFormsHinglish:
      '3 lambi red candles neeche jaati hain, 4th chhoti red candle mein upar wick aati hai, aur 5vi green candle upar breakout deti hai.',
    whatItTellsHinglish:
      'Seedhi ki tarah girawat 4th candle par tham gayi aur 5vi candle mein buyers ne palatwar kar diya.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      '5-candle gradual exhaustion ke baad clear green candle aati hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers control pakad kar price upar le ja rahe hain.',
      actionHinglish: '5vi candle high ke upar close par uptrend pakka hota hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Bottom ka support phir se toot gaya.',
      actionHinglish: '4th candle ke low ke neeche close par setup invalid hota hai.',
    },
    whenWorksHinglish:
      'Lambi continuous girawat ke baad oversold (bahut zyada girne) zone mein badiya kaam karta hai.',
  },
  {
    id: 21,
    name: 'Meeting Lines',
    bias: 'bullish',
    role: 'Reversal',
    trendBefore: 'down',
    hasGap: true,
    candles: [
      [80, 82, 58, 60],
      [48, 62, 46, 60],
    ],
    howItFormsHinglish:
      'Lambi red candle ke baad doosri green candle kaafi neeche open hoti hai par pichli candle ke close level par hi aakar band hoti hai.',
    whatItTellsHinglish:
      'Neeche khulne ke baad buyers ne poori taqat se recover karke sellers ki barabari kar li.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Buyers ne barabari ki hai par abhi paar nahi kiya; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers pichle close ke upar nikal kar control le rahe hain.',
      actionHinglish: '2nd candle high ke upar close milne par bullish signal confirm hota hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle',
      meaningHinglish: 'Sellers ne wapas neeche dhakel diya.',
      actionHinglish: '2nd candle low ke neeche close par girawat jaari rehti hai.',
    },
    whenWorksHinglish:
      'Downtrend ke end mein jab gap-down ke baad tez recovery dikhe tab meaningful hota hai.',
  },

  // ================= BEARISH (22 - 38) =================
  {
    id: 22,
    name: 'Bearish Engulfing',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [
      [52, 64, 50, 62],
      [66, 68, 44, 46],
    ],
    howItFormsHinglish:
      'Pehli chhoti green candle banti hai, phir doosri badi red candle pichli candle ki poori body ko upar se neeche nigal leti hai.',
    whatItTellsHinglish:
      'Buyers thak gaye hain aur sellers ne zor se control apne haath mein le liya hai.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Lambi red engulfing body strong selling pressure dikhati hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Marubozu / Bearish Candle',
      meaningHinglish: 'Sellers follow-through dikha kar price aur neeche la rahe hain.',
      actionHinglish: 'Pattern low ke neeche close milne par girawat tez ho sakti hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne dubara zor lagaya aur sellers ko peeche dhakela.',
      actionHinglish: 'Pattern high ke upar close aane par bearish idea fail hota hai.',
    },
    whenWorksHinglish:
      'Uptrend ke top par resistance (upar ki rukawat) ke paas bahut mazboot; sideways market mein fail ho sakta hai.',
  },
  {
    id: 23,
    name: 'Bearish Belt Hold',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [[80, 80, 48, 52]],
    howItFormsHinglish:
      'Uptrend mein ek lambi red candle bilkul apne high se open hoke bina upper wick ke low ke paas close deti hai.',
    whatItTellsHinglish:
      'Open hote hi sellers ne control le liya aur buyers ko upar jaane ka ek bhi mauka nahi diya.',
    bullishChance: 'Low',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Single strong selling candle hai par agli candle se confirmation lena zaroori hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Selling pressure lagatar barkarar hai.',
      actionHinglish: 'Is candle ke low ke neeche close par girawat jaari reh sakti hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne dip par turant kharidari kar li.',
      actionHinglish: 'Is candle ke high ke upar close par bearish setup toot jata hai.',
    },
    whenWorksHinglish:
      'Resistance zone ke paas uptrend ke baad aaye aur size mein badi ho tab asardar hoti hai.',
  },
  {
    id: 24,
    name: 'Three Black Crows',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [
      [80, 82, 62, 64],
      [72, 74, 50, 52],
      [60, 62, 38, 40],
    ],
    howItFormsHinglish:
      'Lagatar 3 badi red candles chhoti wicks ke saath banti hain, har ek pichli body ke andar khulkar naye low ke paas close hoti hai.',
    whatItTellsHinglish:
      'Sellers bina ruke heavy bikwali kar rahe hain aur buyers piche hat gaye hain.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Lagatar 3 strong red bodies mazboot downtrend dikhati hain; bounce aur confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Small Doji then Bearish Candle',
      meaningHinglish: 'Chhote pause ke baad selling dubara shuru.',
      actionHinglish: 'Upar chhote bounce par resistance hold hone par trend neeche rehta hai.',
    },
    nextIfFails: {
      name: 'Hammer / Bullish Engulfing',
      meaningHinglish: '3 lambi girawaton ke baad sellers thak gaye (exhaustion) aur support se bounce aaya.',
      actionHinglish: 'Teesri candle ke high ke upar close par reversal signal milta hai.',
    },
    whenWorksHinglish:
      'Uptrend top par strong breakdown dikhata hai; par 3 candles ke baad turant short karne se pehle pullback dekhein.',
  },
  {
    id: 25,
    name: 'Bearish Three-Line Strike',
    bias: 'bearish',
    role: 'Continuation',
    trendBefore: 'down',
    candles: [
      [80, 82, 68, 70],
      [70, 72, 58, 60],
      [60, 62, 48, 50],
      [46, 86, 44, 84],
    ],
    howItFormsHinglish:
      '3 red candles neeche jaati hain, phir 4th badi green candle teeno ko cover karke upar close de deti hai.',
    whatItTellsHinglish:
      'Aksar short sellers ke stop-loss udane (short squeeze) ke baad downtrend dubara shuru ho sakta hai.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      '4th candle badi green hoti hai isliye bina downward follow-through ke bearish na maanein; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Price 4th green candle ke low ke neeche phisal gaya aur downtrend resume hua.',
      actionHinglish: '4th candle ke low ke neeche close par hi bearish continuation valid hota hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: '4th green candle asli bullish reversal ban gayi.',
      actionHinglish: '4th candle ke high ke upar close par bearish view fail ho jata hai.',
    },
    whenWorksHinglish:
      'Advanced continuation pattern hai; hamesha 5vi red confirmation candle dekhne ke baad hi bharosa karein.',
  },
  {
    id: 26,
    name: 'Hanging Man',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [[66, 68, 40, 64]],
    howItFormsHinglish:
      'Dikhne mein bilkul Hammer jaisi (upar chhoti body, neeche lambi wick), par yeh uptrend ke TOP par banti hai.',
    whatItTellsHinglish:
      'Top par pehli baar badi bikwali aayi thi; bhale price upar aa gaya par buyers ab kamzor pad rahe hain.',
    bullishChance: 'Low',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Hammer aur Hanging Man same dikhte hain isliye agli red candle bahut zaroori hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Sellers ne Hanging Man ke low ko tod kar girawat pakki ki.',
      actionHinglish: 'Iske low ke neeche red close par bearish reversal confirm hota hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers abhi bhi mazboot hain aur rally jaari hai.',
      actionHinglish: 'Hanging Man high ke upar close par warning khatam ho jati hai.',
    },
    whenWorksHinglish:
      'Sirf lambi tezi (uptrend) ke top aur resistance par count hota hai; downtrend mein yahi candle Hammer kehlati hai.',
  },
  {
    id: 27,
    name: 'Upside Gap Two Crows',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    hasGap: true,
    candles: [
      [50, 72, 48, 70],
      [78, 80, 74, 75],
      [79, 82, 71, 72],
    ],
    howItFormsHinglish:
      'Badi green candle ke baad gap-up mein 2 chhoti red candles banti hain, aur doosri red candle pehli red candle ke neeche close hoti hai.',
    whatItTellsHinglish:
      'Gap-up ke baad buyers upar price sambhal nahi paaye aur do lagatar red candles se momentum palat raha hai.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Top par double rejection + gap exhaustion bearish sanket deta hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Price 1st green candle ki body ke andar ghoos kar neeche ja raha hai.',
      actionHinglish: '2nd crow ke low ke neeche close par selling badh sakti hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne 2nd crow ka high tod kar naya breakout diya.',
      actionHinglish: '2nd crow ke high ke upar close par bearish idea fail hota hai.',
    },
    whenWorksHinglish:
      'Sirf jab gap-up clearly dikh raha ho tab count karein; intraday mein bina gap ke ise na maanein.',
  },
  {
    id: 28,
    name: 'Evening Star',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    hasGap: true,
    candles: [
      [40, 62, 38, 60],
      [64, 70, 63, 68],
      [66, 67, 42, 44],
    ],
    howItFormsHinglish:
      '3 candles: pehli badi green, beech mein top par chhoti star/pause candle, aur teesri badi red jo pehli green ke aadhe se neeche close de.',
    whatItTellsHinglish:
      'Uptrend top par buyers thak gaye aur teesri candle mein sellers ne mazbooti se control le liya.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Morning Star ka ulta — sabse reliable top reversal patterns mein se ek; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Girawat ab naye downtrend mein badal rahi hai.',
      actionHinglish: '3rd red candle ke low ke neeche close par selling pressure jaari rehta hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne upar ka resistance tod diya.',
      actionHinglish: 'Middle star candle ke high ke upar close par setup fail ho jata hai.',
    },
    whenWorksHinglish:
      'Uptrend ke baad resistance zone par best kaam karta hai; agar 3rd candle chhoti ho to signal weak hota hai.',
  },
  {
    id: 29,
    name: 'Shooting Star',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [[62, 90, 59, 60]],
    howItFormsHinglish:
      'Uptrend ke top par neeche chhoti body aur upar 2 guna se zyada lambi wick banti hai (tute taare jaisi).',
    whatItTellsHinglish:
      'Buyers ne upar le jaane ki koshish ki par upar se sellers ne heavy bikwali karke price wapas neeche patak diya.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Upar se lambi rejection wick strong supply zone dikhati hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Sellers ne low tod kar girawat ki shuruwat pakki ki.',
      actionHinglish: 'Shooting Star low ke neeche red close par bearish setup active hota hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne lambi upper wick ko paar kar liya.',
      actionHinglish: 'Shooting Star ke high ke upar close par bearish setup fail hota hai.',
    },
    whenWorksHinglish:
      'Sirf uptrend ke top par resistance ke paas powerful hota hai; downtrend mein same shape Inverted Hammer ban jati hai.',
  },
  {
    id: 30,
    name: 'Bearish Harami',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [
      [40, 62, 38, 60],
      [56, 57, 50, 52],
    ],
    howItFormsHinglish:
      'Pehli badi green candle ke andar doosri chhoti red candle poori tarah sama jati hai.',
    whatItTellsHinglish:
      'Tezi ke baad buyers ki raftaar ruk gayi hai aur upar se halka pressure dikh raha hai.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Yeh pause signal hai, akele weak hota hai isliye confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Pause ke baad price pehli candle ke low se neeche phisal gaya.',
      actionHinglish: '1st green candle ke low ke neeche close par reversal pakka hota hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Pause ke baad buyers dubara upar nikal gaye.',
      actionHinglish: '1st candle ke high ke upar close par bearish idea khatam.',
    },
    whenWorksHinglish:
      'Uptrend resistance par jab volume ghate tab acha kaam karta hai.',
  },
  {
    id: 31,
    name: 'Bearish Doji Star',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    hasGap: true,
    candles: [
      [40, 62, 38, 60],
      [64, 68, 60, 64],
    ],
    howItFormsHinglish:
      'Lambi green candle ke baad top par thoda upar ek Doji (plus/cross jaisi indecision candle) banti hai.',
    whatItTellsHinglish:
      'Tez tezi ke baad buyers aur sellers barabar ho gaye — tezi ruk sakti hai.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Doji sirf rukawat dikhati hai, palatne ke liye agli red confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Evening Star poori tarah confirm ho gaya aur bikwali shuru.',
      actionHinglish: 'Doji low ke neeche red candle close milne par reversal maana jata hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne hesitation khatam karke rally aage badhayi.',
      actionHinglish: 'Doji high ke upar close par uptrend jaari rehta hai.',
    },
    whenWorksHinglish:
      'Uptrend ke baad resistance par; bina teesri red candle ke kabhi short na sochein.',
  },
  {
    id: 32,
    name: 'Bearish Abandoned Baby',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    hasGap: true,
    candles: [
      [40, 62, 38, 60],
      [68, 71, 66, 68],
      [62, 63, 38, 40],
    ],
    howItFormsHinglish:
      'Lambi green candle ke baad gap-up Doji banti hai, phir achanak gap-down ke saath badi red candle neeche girti hai.',
    whatItTellsHinglish:
      'Top par buyers buri tarah trap ho gaye aur sentiment achanak bullish se bearish ho gaya.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Rare par high-accuracy top reversal pattern hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Gap-down hold ho raha hai aur selling badh rahi hai.',
      actionHinglish: '3rd candle ke low ke neeche girawat tez ho sakti hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers wapas upar aakar gap fill kar rahe hain.',
      actionHinglish: 'Middle Doji ke high ke upar close par bearish setup fail.',
    },
    whenWorksHinglish:
      'Sirf jab Doji ke dono taraf asli gap dikhe tab count hota hai.',
  },
  {
    id: 33,
    name: 'Tweezer Top',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [
      [50, 70, 48, 68],
      [68, 70, 52, 54],
    ],
    howItFormsHinglish:
      '2 candles (pehli green, doosri red) jinke high bilkul ek hi upari price level par rukte hain.',
    whatItTellsHinglish:
      'Buyers ne do baar ek hi ceiling todne ki koshish ki par dono baar upar se rejection mila.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Double rejection upar pakka resistance dikhata hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Resistance pakka hone ke baad selling speed pakad rahi hai.',
      actionHinglish: 'Dono candles ke low ke neeche close par downtrend shuru ho sakta hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Resistance level breakout hokar toot gaya.',
      actionHinglish: 'Matched high ke upar close par bearish setup invalid.',
    },
    whenWorksHinglish:
      'Uptrend mein resistance ya day high ke paas sabse zyada reliable hota hai.',
  },
  {
    id: 34,
    name: 'Bearish Kicker',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    hasGap: true,
    candles: [
      [50, 72, 48, 70],
      [46, 48, 20, 22],
    ],
    howItFormsHinglish:
      'Green candle ke baad achanak gap-down ke saath badi red candle neeche ki taraf girti hai.',
    whatItTellsHinglish:
      'Negative khabar ya heavy institutional selling se market mood achanak bearish palat gaya.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Bahut tez selling pressure dikhata hai; gap ke baad confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Marubozu / Bearish Candle',
      meaningHinglish: 'Sellers har chhote bounce par bech rahe hain.',
      actionHinglish: '2nd candle ke low ke neeche girawat jaari reh sakti hai.',
    },
    nextIfFails: {
      name: 'Doji then Bullish Candle',
      meaningHinglish: 'Gap fill hokar price wapas upar aa raha hai.',
      actionHinglish: '2nd candle ke open ke upar close par bearish view fail.',
    },
    whenWorksHinglish:
      'Sirf jab asli gap-down visible ho (opening gap / daily chart) tabhi count karein.',
  },
  {
    id: 35,
    name: 'Bearish Three Inside Down',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [
      [40, 62, 38, 60],
      [58, 60, 48, 50],
      [50, 52, 32, 34],
    ],
    howItFormsHinglish:
      'Pehle Bearish Harami banti hai (badi green + chhoti red), phir teesri red candle pehli green ke open se neeche close hoti hai.',
    whatItTellsHinglish:
      'Harami ka rukna ab confirmed downtrend mein badal chuka hai.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      '3rd candle neeche breakout confirm karti hai; follow-through confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Sellers control pakad kar price aur neeche la rahe hain.',
      actionHinglish: '3rd candle ke low ke neeche selling momentum jaari rehta hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Neeche support milne se price wapas palat gaya.',
      actionHinglish: '2nd candle ke high ke upar close par setup kamzor hota hai.',
    },
    whenWorksHinglish:
      'Clear uptrend ke baad resistance ke paas high reliability deta hai.',
  },
  {
    id: 36,
    name: 'Bearish Three Outside Down',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [
      [52, 64, 50, 62],
      [66, 68, 44, 46],
      [46, 48, 30, 32],
    ],
    howItFormsHinglish:
      'Pehle Bearish Engulfing banti hai (green + usko nigalti red), phir teesri red candle aur neeche close hoti hai.',
    whatItTellsHinglish:
      'Sellers ne engulfing se control liya aur teesri candle mein apni pakad aur mazboot ki.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Engulfing + 3rd confirmation candle dono bearish bias ko pakka karti hain; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Downtrend lagatar aage badh raha hai.',
      actionHinglish: '3rd candle ke low ke neeche girawat continue reh sakti hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne dip par strong kharidari kar li.',
      actionHinglish: '2nd candle ke high ke upar close par bearish setup toot jata hai.',
    },
    whenWorksHinglish:
      'Uptrend top par bahut strong; bas neeche turant koi major support na ho.',
  },
  {
    id: 37,
    name: 'Bearish Mat Hold',
    bias: 'bearish',
    role: 'Continuation',
    trendBefore: 'down',
    candles: [
      [80, 82, 50, 52],
      [54, 60, 52, 58],
      [58, 64, 56, 62],
      [62, 66, 60, 64],
      [60, 62, 32, 34],
    ],
    howItFormsHinglish:
      'Downtrend mein lambi red candle ke baad 3 chhoti green pullback candles aati hain, phir 5vi badi red candle pehli candle ke low ke neeche close deti hai.',
    whatItTellsHinglish:
      'Buyers ki halka bounce koshish fail ho gayi aur sellers ne dubara girawat shuru kar di.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Downtrend mein strong breakdown continuation hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Downtrend bina rukawat naye lows ki taraf ja raha hai.',
      actionHinglish: '5vi candle ke low ke neeche girawat tez ho sakti hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Downside breakout fakeout nikla.',
      actionHinglish: 'Pehli red candle ke high ke upar close par bearish view fail.',
    },
    whenWorksHinglish:
      'Chalte hue downtrend ke beech jab breakdown par volume badhe tab best kaam karta hai.',
  },
  {
    id: 38,
    name: 'Dark Cloud Cover',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [
      [40, 66, 38, 64],
      [70, 72, 48, 50],
    ],
    howItFormsHinglish:
      'Badi green candle ke baad doosri red candle pichle high se upar khulti hai par green body ke 50% se neeche aakar close deti hai.',
    whatItTellsHinglish:
      'Upar khulne ke baad buyers tik nahi paaye aur sellers ne kaale baadal ki tarah rally dhang di.',
    bullishChance: 'Low',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Clear upper rejection aur 50% se neeche closing bearish warning hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Sellers follow-through dikhakar neeche le ja rahe hain.',
      actionHinglish: '2nd candle ke low ke neeche close par girawat pakki hoti hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne 2nd candle ke open ko paar kar liya.',
      actionHinglish: '2nd candle ke high/open ke upar close par setup invalid.',
    },
    whenWorksHinglish:
      'Uptrend ke baad resistance ke paas asardar; agar 50% se upar close ho to weak signal maana jata hai.',
  },

  // ================= BASIC CANDLES (39 - 46) =================
  {
    id: 39,
    name: 'Doji',
    bias: 'neutral',
    role: 'Indecision',
    trendBefore: 'any',
    candles: [[50, 60, 40, 50]],
    howItFormsHinglish:
      'Open aur Close bilkul ek hi level par hote hain — bina body ki ek line aur upar-neeche wicks.',
    whatItTellsHinglish:
      'Buyers aur sellers mein barabar ki takkar hai; abhi koi bhi side jeet nahi paayi.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      '50-50 indecision candle hai; agli disha samajhne ke liye confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle (Breakout Up)',
      meaningHinglish: 'Indecision ke baad buyers jeet kar upar nikal gaye.',
      actionHinglish: 'Doji high ke upar green close par bullish move shuru ho sakta hai.',
    },
    nextIfFails: {
      name: 'Bearish Candle (Breakout Down)',
      meaningHinglish: 'Indecision ke baad sellers jeet kar neeche le gaye.',
      actionHinglish: 'Doji low ke neeche red close par bearish move shuru ho sakta hai.',
    },
    whenWorksHinglish:
      'Tez move ke baad support/resistance par aaye to trend palatne ka pehla ishara hoti hai; sideways mein bekar hoti hai.',
  },
  {
    id: 40,
    name: 'Gravestone Doji',
    bias: 'bearish',
    role: 'Reversal',
    trendBefore: 'up',
    candles: [[40, 70, 40, 40]],
    howItFormsHinglish:
      'Open, Low aur Close neeche ek hi level par hote hain aur upar bahut lambi wick banti hai (ulta T).',
    whatItTellsHinglish:
      'Buyers ne bahut upar kheenchne ki koshish ki par closing tak sellers ne poora zor lagakar wapas neeche la diya.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Upar se 100% rejection heavy supply dikhata hai; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Sellers ne ab neeche ka level bhi tod diya.',
      actionHinglish: 'Doji low ke neeche red close par girawat tez hoti hai.',
    },
    nextIfFails: {
      name: 'Bullish Candle',
      meaningHinglish: 'Buyers ne lambi upper wick ko paar kar liya.',
      actionHinglish: 'Doji high ke upar close par bearish view fail ho jata hai.',
    },
    whenWorksHinglish:
      'Uptrend top aur strong resistance par best kaam karta hai.',
  },
  {
    id: 41,
    name: 'Long-Legged Doji',
    bias: 'neutral',
    role: 'Indecision',
    trendBefore: 'any',
    candles: [[50, 75, 25, 50]],
    howItFormsHinglish:
      'Open aur Close beech mein barabar hote hain aur upar-neeche dono side bahut lambi wicks hoti hain.',
    whatItTellsHinglish:
      'Market mein bahut tez confusion aur volatility (utaar-chadhav) hai — dono taraf stop-loss hit hue.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'High confusion ki wajah se koi clear edge nahi; confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Big Bullish Candle',
      meaningHinglish: 'Badi ladai ke baad buyers ne upar breakout diya.',
      actionHinglish: 'Upar close hone par hi direction clear hoti hai.',
    },
    nextIfFails: {
      name: 'Big Bearish Candle',
      meaningHinglish: 'Badi ladai ke baad sellers jeet gaye.',
      actionHinglish: 'Neeche close hone par selling momentum aata hai.',
    },
    whenWorksHinglish:
      'News/event ya support-resistance zone par banti hai; iske high-low ke bahar close aane ka intezar karein.',
  },
  {
    id: 42,
    name: 'Spinning Top',
    bias: 'neutral',
    role: 'Indecision',
    trendBefore: 'any',
    candles: [[48, 66, 32, 54]],
    howItFormsHinglish:
      'Beech mein chhoti body aur upar-neeche lagbhag barabar length ki wicks banti hain.',
    whatItTellsHinglish:
      'Market mein raftaar thodi ruk gayi hai — buyers aur sellers abhi faisla kar rahe hain.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Yeh pause/indecision dikhati hai; agla kadam tay karne ke liye confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Trend Continuation Candle',
      meaningHinglish: 'Rukawat ke baad purana trend phir se shuru.',
      actionHinglish: 'Agli candle jis taraf high/low tode udhar move aata hai.',
    },
    nextIfFails: {
      name: 'Reversal Candle',
      meaningHinglish: 'Purana trend thak gaya aur ulta move shuru.',
      actionHinglish: 'Opposite side break hone par short-term reversal milta hai.',
    },
    whenWorksHinglish:
      'Tez rally ya fall ke baad aaye to caution (saavdhani) ka sanket deti hai.',
  },
  {
    id: 43,
    name: 'Bullish Marubozu',
    bias: 'bullish',
    role: 'Continuation',
    trendBefore: 'any',
    candles: [[30, 70, 30, 70]],
    howItFormsHinglish:
      'Bina kisi upper ya lower wick ke ek lambi poori green candle (Open = Low, Close = High).',
    whatItTellsHinglish:
      'Pehle second se aakhiri second tak buyers ka poora 100% control tha.',
    bullishChance: 'High',
    bearishChance: 'Low',
    chancesReasonHinglish:
      'Sabse mazboot single bullish candle hai; par agar bahut badi ho to pullback par confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bullish Candle',
      meaningHinglish: 'Strong buying momentum agle candle mein bhi jaari hai.',
      actionHinglish: 'Midpoint (50% level) hold rehne tak buyers control mein rehte hain.',
    },
    nextIfFails: {
      name: 'Doji / Shooting Star (Exhaustion)',
      meaningHinglish: 'Itni badi candle ke baad profit booking ya thakaan aa gayi.',
      actionHinglish: 'Marubozu ke low ke neeche close par setup kamzor padta hai.',
    },
    whenWorksHinglish:
      'Breakout par ya support se bounce ke waqt bahut reliable; resistance ke theek neeche ho to rukawat aa sakti hai.',
  },
  {
    id: 44,
    name: 'Bearish Marubozu',
    bias: 'bearish',
    role: 'Continuation',
    trendBefore: 'any',
    candles: [[70, 70, 30, 30]],
    howItFormsHinglish:
      'Bina kisi upper ya lower wick ke ek lambi poori red candle (Open = High, Close = Low).',
    whatItTellsHinglish:
      'Shuru se ant tak sellers ka 100% control raha aur kisi ne kharidari nahi ki.',
    bullishChance: 'Low',
    bearishChance: 'High',
    chancesReasonHinglish:
      'Sabse mazboot single bearish candle hai; follow-through aur confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Bearish Candle',
      meaningHinglish: 'Tez bikwali aage bhi jaari hai.',
      actionHinglish: 'Candle ke 50% level ke neeche rehne tak sellers haavi rehte hain.',
    },
    nextIfFails: {
      name: 'Doji / Hammer (Exhaustion)',
      meaningHinglish: 'Tez girawat ke baad buyers support par active ho gaye.',
      actionHinglish: 'Marubozu ke high ke upar close par bearish momentum khatam.',
    },
    whenWorksHinglish:
      'Support breakdown par bahut asardar; par support zone par aaye to bounce ka dhyan rakhein.',
  },
  {
    id: 45,
    name: 'Inside Bar',
    bias: 'neutral',
    role: 'Continuation',
    trendBefore: 'any',
    candles: [
      [30, 80, 20, 70],
      [45, 65, 38, 58],
    ],
    howItFormsHinglish:
      'Pehli badi candle (Mother Candle) ke High aur Low ke poori tarah andar doosri chhoti candle (Baby) banti hai.',
    whatItTellsHinglish:
      'Market mein energy ikattha ho rahi hai (compression) — jald ek side bada breakout aa sakta hai.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Breakout kisi bhi side aa sakta hai; mother candle todne wali confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Breakout Candle (Above/Below Mother)',
      meaningHinglish: 'Jis taraf range tooti udhar tez move shuru.',
      actionHinglish: 'Mother candle ke high ke upar bullish, ya low ke neeche bearish.',
    },
    nextIfFails: {
      name: 'Range / Fake Breakout',
      meaningHinglish: 'Breakout tik nahi paaya aur price wapas mother range mein aa gaya.',
      actionHinglish: 'Inside bar ke opposite edge par stop-loss logic rakha jata hai.',
    },
    whenWorksHinglish:
      'Tez trend ke baad consolidation mein best kaam karta hai; bahut choppy sideways market mein fakeout deta hai.',
  },
  {
    id: 46,
    name: 'Outside Bar',
    bias: 'neutral',
    role: 'Reversal',
    trendBefore: 'any',
    candles: [
      [50, 60, 44, 54],
      [44, 72, 38, 68],
    ],
    howItFormsHinglish:
      'Doosri badi candle pehli candle ke High aur Low dono ko poori tarah paar karke cover kar leti hai.',
    whatItTellsHinglish:
      'High volatility (tez hil-dul) ke saath price ek taraf strong momentum pakad raha hai.',
    bullishChance: 'Medium',
    bearishChance: 'Medium',
    chancesReasonHinglish:
      'Closing direction hi aage ka ishara deti hai; agli confirmation candle ka wait karo.',
    nextIfConfirmed: {
      name: 'Continuation Candle (Close Direction)',
      meaningHinglish: 'Jis direction mein outside bar close hui udhar momentum jaari.',
      actionHinglish: 'Outside bar ke high/low break hone par follow-through aata hai.',
    },
    nextIfFails: {
      name: 'Fakeout Reversal Candle',
      meaningHinglish: 'Dono side stop-loss udakar market range mein wapas chala gaya.',
      actionHinglish: 'Outside bar ka opposite high/low tootne par view fail hota hai.',
    },
    whenWorksHinglish:
      'Key support ya resistance level par high volume ke saath bane tab strong hoti hai.',
  },
];

export function findPatternByName(name: string): PatternDefinition | undefined {
  if (!name) return undefined;
  const clean = name.replace(/\s*\(plain\)/i, '').trim().toLowerCase();
  const exact = PATTERN_LIBRARY.find((p) => p.name.toLowerCase() === clean);
  if (exact) return exact;

  if (clean.includes('bullish candle')) {
    return PATTERN_LIBRARY.find((p) => p.name === 'Bullish Marubozu');
  }
  if (clean.includes('bearish candle')) {
    return PATTERN_LIBRARY.find((p) => p.name === 'Bearish Marubozu');
  }
  return PATTERN_LIBRARY.find(
    (p) => p.name.toLowerCase().includes(clean) || clean.includes(p.name.toLowerCase())
  );
}
