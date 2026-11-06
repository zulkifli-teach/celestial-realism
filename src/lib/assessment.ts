export type Question = { q: string; options: string[]; answer: number; explain: string };

export const QUESTIONS: Question[] = [
  { q: "Pusat dari sistem tata surya kita adalah…", options: ["Bumi", "Bulan", "Matahari", "Jupiter"], answer: 2, explain: "Matahari adalah bintang di pusat tata surya. Semua planet beredar mengelilinginya karena gaya gravitasi Matahari." },
  { q: "Planet yang paling dekat dengan Matahari adalah…", options: ["Venus", "Merkurius", "Mars", "Bumi"], answer: 1, explain: "Urutan planet dari Matahari: Merkurius, Venus, Bumi, Mars, Jupiter, Saturnus, Uranus, Neptunus." },
  { q: "Planet terbesar di tata surya adalah…", options: ["Saturnus", "Neptunus", "Bumi", "Jupiter"], answer: 3, explain: "Jupiter adalah planet terbesar; ukurannya lebih dari 11 kali diameter Bumi." },
  { q: "Rotasi Bumi adalah…", options: ["Perputaran Bumi pada porosnya", "Peredaran Bumi mengelilingi Matahari", "Peredaran Bulan mengelilingi Bumi", "Pergerakan Matahari mengelilingi Bumi"], answer: 0, explain: "Rotasi berarti Bumi berputar pada porosnya sendiri, satu kali putaran sekitar 24 jam." },
  { q: "Akibat dari rotasi Bumi adalah terjadinya…", options: ["Pergantian musim", "Pergantian siang dan malam", "Fase Bulan", "Gerhana Matahari"], answer: 1, explain: "Saat berotasi, bagian Bumi yang menghadap Matahari mengalami siang, sedangkan yang membelakangi mengalami malam." },
  { q: "Waktu yang dibutuhkan Bumi untuk satu kali revolusi adalah sekitar…", options: ["24 jam", "1 bulan", "365¼ hari", "10 tahun"], answer: 2, explain: "Bumi mengelilingi Matahari dalam waktu sekitar 365¼ hari, yaitu satu tahun." },
  { q: "Pergantian musim di Bumi terjadi karena…", options: ["Rotasi Bumi saja", "Revolusi Bumi dan poros Bumi yang miring", "Bulan mengelilingi Bumi", "Matahari berputar"], answer: 1, explain: "Poros Bumi miring sekitar 23,5°. Saat berevolusi, belahan Bumi utara dan selatan bergantian lebih condong ke Matahari sehingga terjadi musim." },
  { q: "Matahari terlihat terbit dari timur dan terbenam di barat karena…", options: ["Matahari bergerak mengelilingi Bumi", "Bumi berotasi dari barat ke timur", "Bumi berevolusi", "Bulan menutupi Matahari"], answer: 1, explain: "Bumi berotasi dari barat ke timur, sehingga Matahari tampak bergerak dari timur ke barat. Ini disebut gerak semu harian Matahari." },
  { q: "Mengapa kita selalu melihat sisi Bulan yang sama?", options: ["Bulan tidak berotasi", "Waktu rotasi dan revolusi Bulan sama", "Bumi tidak berotasi", "Bulan sangat jauh"], answer: 1, explain: "Bulan berotasi dan berevolusi dalam waktu yang sama (sekitar 27,3 hari), sehingga sisi yang sama selalu menghadap Bumi." },
  { q: "Indonesia mengalami siang hari ketika…", options: ["Wilayah Indonesia menghadap Matahari", "Bulan berada di atas Indonesia", "Bumi berhenti berotasi", "Indonesia membelakangi Matahari"], answer: 0, explain: "Siang terjadi saat wilayah Indonesia berada di sisi Bumi yang menghadap Matahari dan menerima cahayanya." },
];

export function checkAnswer(question: Question, choice: number) {
  return choice === question.answer;
}
