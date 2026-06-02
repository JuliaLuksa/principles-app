export const translations = {
  en: {
    appTitle: 'Principles',
    tagline: 'Learn design principles, one a day.',
    nav: { daily: 'Daily', explore: 'Explore', quiz: 'Quiz', settings: 'Settings' },
    home: {
      greetingMorning: 'Good morning',
      greetingAfternoon: 'Good afternoon',
      greetingEvening: 'Good evening',
      streak: 'day streak',
      streakOne: 'day streak',
      todaysSession: "Today's session",
      newCard: 'new',
      reviews: 'reviews',
      startDaily: 'Start daily session',
      allDone: "You're done for today.",
      allDoneSub: 'Come back tomorrow, or explore a collection.',
      totalLearned: 'Principles learned',
      totalSeen: 'Principles seen'
    },
    daily: {
      reveal: 'Reveal',
      again: 'Again',
      good: 'Good',
      easy: 'Easy',
      againHint: 'Less than a minute',
      goodHint: '',
      easyHint: '',
      sessionComplete: 'Session complete',
      sessionCompleteSub: 'Nice work. See you tomorrow.',
      backHome: 'Back to home',
      cardsLeft: 'left',
      source: 'Source',
      via: 'via'
    },
    explore: {
      title: 'Explore collections',
      subtitle: 'Read a full set, then add principles to your daily study.',
      principles: 'principles',
      learning: 'learning',
      learned: 'learned',
      addAll: 'Add all to daily',
      added: 'Added',
      add: 'Add to daily',
      remove: 'Remove from daily',
      readSource: 'Read original source',
      viaPrinciples: 'Discovered via principles.design'
    },
    quiz: {
      title: 'Quiz',
      subtitle: 'Which company published this principle?',
      start: 'Start quiz',
      next: 'Next',
      finish: 'See results',
      correct: 'Correct',
      wrong: 'Wrong',
      wasCorrect: 'The answer was',
      yourScore: 'Your score',
      tryAgain: 'Try again',
      backHome: 'Back to home'
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      polish: 'Polski',
      english: 'English',
      theme: 'Appearance',
      themeAuto: 'Auto',
      themeLight: 'Light',
      themeDark: 'Dark',
      resetProgress: 'Reset all progress',
      resetConfirm: 'Are you sure? This will erase your streak and all card progress.',
      resetDone: 'Progress reset.',
      install: 'Install app',
      installHint: 'Tap to add to home screen',
      about: 'About',
      aboutBody: 'A small open-source app for learning design principles with spaced repetition. All principles are quoted from publicly available sources, discovered via principles.design — a curated library by Ben Holliday. Please support the original aggregator and the original publishers.',
      createdBy: 'Created by',
      version: 'Version',
      sourceCode: 'Source code'
    },
    attribution: {
      via: 'Principles via',
      and: 'and the original publishers'
    }
  },
  pl: {
    appTitle: 'Principles',
    tagline: 'Ucz się zasad projektowych — jedna dziennie.',
    nav: { daily: 'Dziś', explore: 'Eksploruj', quiz: 'Quiz', settings: 'Ustawienia' },
    home: {
      greetingMorning: 'Dzień dobry',
      greetingAfternoon: 'Cześć',
      greetingEvening: 'Dobry wieczór',
      streak: 'dni z rzędu',
      streakOne: 'dzień',
      todaysSession: 'Dzisiejsza sesja',
      newCard: 'nowych',
      reviews: 'powtórek',
      startDaily: 'Zacznij sesję',
      allDone: 'Na dziś koniec.',
      allDoneSub: 'Wróć jutro albo zajrzyj do kolekcji.',
      totalLearned: 'Nauczonych zasad',
      totalSeen: 'Poznanych zasad'
    },
    daily: {
      reveal: 'Pokaż',
      again: 'Jeszcze raz',
      good: 'Dobrze',
      easy: 'Łatwo',
      againHint: 'Za chwilę',
      goodHint: '',
      easyHint: '',
      sessionComplete: 'Sesja skończona',
      sessionCompleteSub: 'Dobra robota. Do zobaczenia jutro.',
      backHome: 'Powrót',
      cardsLeft: 'zostało',
      source: 'Źródło',
      via: 'przez'
    },
    explore: {
      title: 'Kolekcje',
      subtitle: 'Przeczytaj cały zestaw, dodaj zasady do nauki dziennej.',
      principles: 'zasad',
      learning: 'uczę się',
      learned: 'znam',
      addAll: 'Dodaj wszystkie',
      added: 'Dodano',
      add: 'Dodaj do nauki',
      remove: 'Usuń z nauki',
      readSource: 'Czytaj oryginał',
      viaPrinciples: 'Odkryte przez principles.design'
    },
    quiz: {
      title: 'Quiz',
      subtitle: 'Która firma opublikowała tę zasadę?',
      start: 'Zacznij quiz',
      next: 'Dalej',
      finish: 'Zobacz wynik',
      correct: 'Dobrze',
      wrong: 'Źle',
      wasCorrect: 'Poprawna odpowiedź to',
      yourScore: 'Twój wynik',
      tryAgain: 'Spróbuj jeszcze raz',
      backHome: 'Powrót'
    },
    settings: {
      title: 'Ustawienia',
      language: 'Język',
      polish: 'Polski',
      english: 'English',
      theme: 'Wygląd',
      themeAuto: 'Auto',
      themeLight: 'Jasny',
      themeDark: 'Ciemny',
      resetProgress: 'Wyzeruj postęp',
      resetConfirm: 'Na pewno? Stracisz cały streak i postęp kart.',
      resetDone: 'Wyzerowano.',
      install: 'Zainstaluj apkę',
      installHint: 'Stuknij, by dodać do ekranu głównego',
      about: 'O aplikacji',
      aboutBody: 'Mała open-source apka do nauki zasad projektowych z powtórkami w odstępach. Wszystkie zasady cytowane są z publicznie dostępnych źródeł, odkryte przez principles.design — kuratorowaną bibliotekę Bena Hollidaya. Wesprzyj oryginalny agregator i wydawców źródłowych.',
      createdBy: 'Stworzyła',
      version: 'Wersja',
      sourceCode: 'Kod źródłowy'
    },
    attribution: {
      via: 'Zasady pochodzą z',
      and: 'oraz oryginalnych wydawców'
    }
  }
};

export function t(lang, path) {
  const parts = path.split('.');
  let cur = translations[lang] || translations.en;
  for (const p of parts) {
    cur = cur?.[p];
    if (cur === undefined) return path;
  }
  return cur;
}
