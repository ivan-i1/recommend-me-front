/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, { useState, useContext, createContext, useEffect, useRef, use } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Modal, Pressable } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { useTranslation } from 'react-i18next';
import i18n, { detectLanguage, detectRegion } from './src/i18n';

const localTest = Platform.OS === 'web'
  ? ''
  : 'http://188.166.155.92:8000';
const MAX_YEAR = 2025;
const MIN_YEAR = 2020;

const Stack = createNativeStackNavigator();

const GenresContext = createContext({
  genres: [] as any[],
  setGenres: (genres: any[]) => { }
});

const GenresListContext = createContext({
  genresList: [] as string[],
  setGenresList: (genres: string[]) => { }
});

const StackContext = createContext({
  stack: [] as any[],
  pushToStack: (item: any) => { },
  removeFromStack: (id: any) => { },
  clearStack: () => { }
});

const PairContext = createContext({
  pair: [] as any[],
  setPair: (pair: any) => { },
  clearPair: () => { }
});

const VectorContext = createContext({
  vector: [] as number[],
  setVector: (vector: number[]) => { },
  clearVector: () => { }
});

const FiltersContext = createContext({
  selectedGenres: null as string[] | null,
  setSelectedGenres: (vals: string[] | null) => { },
  minYear: '',
  setMinYear: (val: string) => { },
  maxYear: '',
  setMaxYear: (val: string) => { },
});

const LocaleContext = createContext({
  language: 'en',
  setLanguage: (_lng: string) => { },
  region: '',
});

// --- CUSTOM COMPONENTS ---
const CinemaButton = ({ title, onPress, type = 'primary', width }: any) => {
  const isPrimary = type === 'primary';
  const glowHex = isPrimary ? COLORS.gold : COLORS.blue;
  const widthStyle = width ? { width } : undefined;
  return (
    <Pressable onPress={onPress} style={widthStyle}>
      {({ pressed }) => (
        <Shadow
          distance={pressed ? 18 : 10}
          startColor={glowHex + (pressed ? 'CC' : '99')}
          endColor={glowHex + '00'}
          offset={[0, 0]}
          style={widthStyle}
        >
          <View style={[
            styles.cinemaBtn,
            isPrimary ? styles.btnPrimary : styles.btnSecondary,
            widthStyle,
          ]}>
            <View style={[
              styles.btnInnerBorder,
              isPrimary ? styles.btnInnerPrimary : styles.btnInnerSecondary
            ]}>
              <Text style={[
                styles.btnText,
                isPrimary ? styles.textGold : styles.textWhite
              ]}>
                {title.toUpperCase()}
              </Text>
            </View>
          </View>
        </Shadow>
      )}
    </Pressable>
  );
};

const PosterButton = ({ imageUri, onPress }: any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: '100%',
        aspectRatio: 2 / 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: COLORS.cardBg,
        borderRadius: 8,
        padding: 4,
      }}
    >
      <Image
        source={{ uri: imageUri }}
        style={{ width: '100%', height: '100%', borderRadius: 8 }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

const MarqueeHeader = ({
  text,
  containerStyle,
  variant = 'red',
}: { text: string; containerStyle?: any; variant?: 'red' | 'blue' }) => {
  const isBlue = variant === 'blue';
  return (
    <View style={[
      styles.marqueeContainer,
      isBlue && styles.marqueeContainerBlue,
      containerStyle,
    ]}>
      <View style={[styles.marqueeBorder, isBlue && styles.marqueeBorderBlue]}>
        <Text style={[styles.marqueeText, isBlue && styles.marqueeTextBlue]}>
          {text}
        </Text>
      </View>
    </View>
  );
};

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

function LanguageSwitcher() {
  const { language, setLanguage } = useContext(LocaleContext);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.langTrigger}
        activeOpacity={0.7}
      >
        <Text style={styles.langTriggerText}>🌐 {language.toUpperCase()}</Text>
      </TouchableOpacity>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.langCard}>
            {LANGUAGE_OPTIONS.map(({ code, label }) => (
              <TouchableOpacity
                key={code}
                style={styles.langRow}
                onPress={() => { setLanguage(code); setIsOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.langRowText, language === code && styles.langRowTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MovieCard({ movieData }: { movieData: any }) {
  const { t } = useTranslation();
  const [posterWidth, setPosterWidth] = useState<number>(0);
  return (
    <View style={styles.movieCard}>
      <View style={{ height: 50, justifyContent: 'flex-end', alignItems: 'center', width: '100%', paddingBottom: 10 }}>
        <Text style={[styles.textGold, styles.text, { textAlign: 'center', marginBottom: 0 }]} numberOfLines={2} adjustsFontSizeToFit>{movieData.name}</Text>
      </View>
      <View
        style={{ width: '100%' }}
        onLayout={(e) => setPosterWidth(e.nativeEvent.layout.width)}
      >
        <PosterButton
          imageUri={movieData.image}
          onPress={() => {
            // Changed to pass the entire movieData object instead of just the name
            movieData.selectionHandler(movieData)
          }}
        />
      </View>
      <CinemaButton
        title={t('details')}
        type="secondary"
        width={posterWidth || undefined}
        onPress={() => movieData.detailsHandler(movieData)}
      />
    </View>
  );
}

const CinemaMultiSelectModal = ({ label, options, selectedValues, onChange }: any) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const allSelected = selectedValues === null;
  const noneSelected = Array.isArray(selectedValues) && selectedValues.length === 0;
  const isChecked = (opt: string) => allSelected || (selectedValues || []).includes(opt);

  const toggle = (val: string) => {
    let next: string[];
    if (allSelected) {
      next = options.filter((o: string) => o !== val);
    } else if (selectedValues.includes(val)) {
      next = selectedValues.filter((v: string) => v !== val);
    } else {
      next = [...selectedValues, val];
    }
    if (next.length === options.length) {
      onChange(null);
    } else {
      onChange(next);
    }
  };

  const selectAll = () => onChange(null);
  const selectNone = () => onChange([]);

  const valueText = allSelected
    ? `${t('filter_all')} ▼`
    : noneSelected
      ? `${t('filter_any')} ▼`
      : selectedValues.length === 1
        ? selectedValues[0]
        : t('filter_selected', { count: selectedValues.length });

  return (
    <View style={styles.genreTriggerWrap}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownHeaderText}>
          <Text style={{ fontFamily: 'Oswald-Bold' }}>{label}: </Text>
          {valueText}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.chipCloud}>
              {options.map((opt: string) => {
                const checked = isChecked(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, checked ? styles.chipSelected : styles.chipUnselected]}
                    onPress={() => toggle(opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, checked ? styles.chipTextSelected : styles.chipTextUnselected]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={[styles.modalAction, { color: COLORS.primaryRed }]}>{t('filter_select_all')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={selectNone}>
                <Text style={[styles.modalAction, { color: COLORS.primaryRed }]}>{t('filter_deselect_all')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={[styles.modalAction, { color: COLORS.gold }]}>{t('filter_done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const WHEEL_ITEM_HEIGHT = 28;
const WHEEL_VISIBLE_COUNT = 3;
const WHEEL_PAD_COUNT = Math.floor(WHEEL_VISIBLE_COUNT / 2);

const CinemaYearWheel = ({ label, value, min, max, onChange }: any) => {
  const years = Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
  const scrollRef = useRef<ScrollView>(null);
  const hasInitialScrolledRef = useRef(false);
  const lastReportedRef = useRef<string>(value || years[0]);
  const lastYRef = useRef(0);
  const settleTimerRef = useRef<any>(null);

  const targetIndex = Math.max(0, years.indexOf(value));

  useEffect(() => {
    lastReportedRef.current = value;
    if (hasInitialScrolledRef.current) {
      scrollRef.current?.scrollTo({ y: targetIndex * WHEEL_ITEM_HEIGHT, animated: true });
    }
  }, [targetIndex, value]);

  useEffect(() => () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
  }, []);

  const settle = () => {
    const idx = Math.max(0, Math.min(years.length - 1, Math.round(lastYRef.current / WHEEL_ITEM_HEIGHT)));
    const selected = years[idx];
    if (selected !== lastReportedRef.current) {
      lastReportedRef.current = selected;
      onChange(selected);
    }
  };

  const scheduleSettle = () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(settle, 80);
  };

  return (
    <View style={styles.wheelContainer}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelFrame}>
        <View style={styles.wheelDimTop} pointerEvents="none" />
        <View style={styles.wheelDimBottom} pointerEvents="none" />
        <View style={styles.wheelCenterHighlight} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          disableIntervalMomentum
          nestedScrollEnabled
          onScroll={(e) => { lastYRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          onMomentumScrollEnd={scheduleSettle}
          onScrollEndDrag={scheduleSettle}
          onContentSizeChange={() => {
            if (!hasInitialScrolledRef.current) {
              scrollRef.current?.scrollTo({ y: targetIndex * WHEEL_ITEM_HEIGHT, animated: false });
              hasInitialScrolledRef.current = true;
            }
          }}
          contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT }}
        >
          {years.map((y) => (
            <View key={y} style={styles.wheelItem}>
              <Text style={styles.wheelItemText}>{y}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

function SelectionScreen({ navigation }: any) {
  const { stack, pushToStack, clearStack } = useContext(StackContext);
  const { pair, setPair } = useContext(PairContext);
  const { vector, setVector, clearVector } = useContext(VectorContext);
  const { genresList } = useContext(GenresListContext);
  const { genres } = useContext(GenresContext);
  const { selectedGenres, setSelectedGenres, minYear, setMinYear, maxYear, setMaxYear } = useContext(FiltersContext);
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const requestMoviePair = (
    currentGenres = selectedGenres,
    currentMin = minYear,
    currentMax = maxYear,
    freshSelection = true,
    currentVector = vector,
    currentIds = stack.map((s: any) => s.id)
  ) => {
    console.log("Requesting pair with filters:", { currentGenres, currentMin, currentMax, freshSelection, currentVector, currentIds });
    const genreIds = (currentGenres ?? [])
      .map((name: string) => genres.find((g: any) => g?.name?.toLowerCase() === name.toLowerCase())?.id)
      .filter((id: any) => id !== undefined && id !== null) as number[];
    freshSelection
      ? requestFirstPair(genreIds, currentMin, currentMax)
      : requestMoviePostPair(genreIds, currentMin, currentMax, currentVector, currentIds);
  }

  const requestFirstPair = (
    genreIds: number[],
    currentMin = minYear,
    currentMax = maxYear,
  ) => {
    console.log("Requesting GET pair with filters:", { genreIds, currentMin, currentMax });
    let url = `${localTest}/movies/start_movies/`;
    const params = [];

    let isMinValid = currentMin && currentMin.length === 4 && Number.isInteger(Number(currentMin)) && Number(currentMin) >= 1900 && Number(currentMin) <= MAX_YEAR;
    let isMaxValid = currentMax && currentMax.length === 4 && Number.isInteger(Number(currentMax)) && Number(currentMax) >= 1900 && Number(currentMax) <= MAX_YEAR;
    currentMax = isMaxValid ? currentMax : MAX_YEAR.toString();
    currentMin = isMinValid ? currentMin : MIN_YEAR.toString();

    params.push(`genres=${encodeURIComponent('[' + genreIds.join(',') + ']')}`);
    params.push(`adult=0`);
    (currentMin) ? params.push(`min_year=${encodeURIComponent(currentMin)}`) : params.push(`min_year=${MIN_YEAR}`);
    (currentMax) ? params.push(`max_year=${encodeURIComponent(currentMax)}`) : params.push(`max_year=${MAX_YEAR}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    setIsError(false);
    setIsEmpty(false);
    setIsLoading(true);
    fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => response.json())
      .then(json => {
        console.log('Got pair:', json)
        setPair(json);
        setIsEmpty(!Array.isArray(json) || json.length < 2);
        setIsLoading(false);
      })
      .catch(error => {
        console.error(error);
        setIsError(true);
        setIsLoading(false);
      });
  }

  const requestMoviePostPair = (
    genreIds: number[],
    currentMin = minYear,
    currentMax = maxYear,
    currentVector = vector,
    currentIds = stack.map((s: any) => s.id)
  ) => {
    console.log("Requesting POST pair with filters:", { genreIds, currentMin, currentMax, currentVector, currentIds });
    let url = `${localTest}/movies/two_options/`;
    let body = {
      vector: currentVector.length === 43 ? currentVector : [], // Uses computed vector
      min_year: currentMin && currentMin.length === 4 ? parseInt(currentMin) : MIN_YEAR,
      max_year: currentMax && currentMax.length === 4 ? parseInt(currentMax) : MAX_YEAR,
      genres: genreIds,
      adult: 0,
      ids: currentIds.filter(Boolean)
    };
    console.log("two_options payload:", JSON.stringify(body));

    setIsError(false);
    setIsEmpty(false);
    setIsLoading(true);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(response => response.json())
      .then(json => {
        setPair(json);
        setIsEmpty(!Array.isArray(json) || json.length < 2);
        setIsLoading(false);
      })
      .catch(error => {
        console.error(error);
        setIsError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    // Guard on isEmpty so an empty API result ([]) doesn't retrigger a fetch loop.
    if (pair.length === 0 && !isEmpty) {
      requestMoviePair();
    } else {
      setIsLoading(false);
    }
  }, [pair.length, isEmpty]);

  // 3. Filter handlers just stage values — request fires on "Request New Movies"
  const handleGenresChange = (vals: string[] | null) => setSelectedGenres(vals);
  const handleMinYearChange = (val: string) => {
    setMinYear(val);
    if (Number(val) > Number(maxYear)) setMaxYear(val);
  };
  const handleMaxYearChange = (val: string) => {
    setMaxYear(val);
    if (Number(val) < Number(minYear)) setMinYear(val);
  };

  const handleRequestNewMovies = () => {
    clearStack();
    clearVector();
    requestMoviePair(selectedGenres, minYear, maxYear, true, []);
  };

  // No-results recovery actions.
  // NOTE: per spec, "Reset Filters" should clear only the extra director/actor/
  // language/country filters (keeping genre + years). Those filters are Story 3
  // (backend-blocked, not built yet), so today this resets the only filters that
  // exist — genre + year range. Narrow this once Story 3 lands.
  const handleResetFilters = () => {
    const defMin = MIN_YEAR.toString();
    const defMax = MAX_YEAR.toString();
    setSelectedGenres(null);
    setMinYear(defMin);
    setMaxYear(defMax);
    clearStack();
    clearVector();
    requestMoviePair(null, defMin, defMax, true, []);
  };

  const handleAdjustFilters = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // 4. Selection Logic (Vector Math happens here)
  const handleSelection = (chosenMovie: any) => {
    const { selectionHandler, detailsHandler, ...movieToStore } = chosenMovie;
    pushToStack(movieToStore);

    let newVector: number[] = [];
    const movieVector = chosenMovie.vector || [];

    if (vector.length === 0) {
      // Rule 1: Replace empty vector on selection
      newVector = movieVector;
    } else if (movieVector.length === 43 && vector.length === 43) {
      // Rule 2: Average existing vector on selection
      newVector = vector.map((val, idx) => (val + movieVector[idx]) / 2);
    } else {
      newVector = vector; // Fallback just in case
    }

    setVector(newVector);

    const newIds = [...stack.map((s: any) => s.id), chosenMovie.id];

    // Pass newVector directly to API so we don't wait for React state to update
    requestMoviePair(selectedGenres, minYear, maxYear, false, newVector, newIds);
    navigation.navigate('Pick a movie');
  };

  const handleDetails = (movie: any) => {
    const { selectionHandler, detailsHandler, ...movieToPass } = movie;
    navigation.navigate('Details', { movie: movieToPass });
  };

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text={t('error_title')} />
          <Text style={styles.subText}>{t('error_subtitle')}</Text>
          <View style={styles.spacerLarge} />
          <CinemaButton
            title={t('retry_connection')}
            onPress={() => requestMoviePair(selectedGenres, minYear, maxYear, vector.length === 0, vector)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text={t('loading_title')} />
          <Text style={styles.subText}>{t('loading_subtitle')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showEmpty = isEmpty || (pair?.length ?? 0) < 2;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} style={{ width: '100%' }}>
        <View style={styles.filtersContainerTop}>
          <CinemaMultiSelectModal
            label={t('filter_genre')}
            options={genresList.length > 0 ? genresList : [t('loading_short')]}
            selectedValues={selectedGenres}
            onChange={handleGenresChange}
          />
        </View>

        <View style={styles.filtersContainerBottom}>
          <CinemaYearWheel
            label={t('filter_min_year')}
            value={minYear}
            min={1950}
            max={MAX_YEAR}
            onChange={handleMinYearChange}
          />
          <CinemaYearWheel
            label={t('filter_max_year')}
            value={maxYear}
            min={1950}
            max={MAX_YEAR}
            onChange={handleMaxYearChange}
          />
        </View>

        {showEmpty ? (
          <View style={styles.emptyState}>
            <MarqueeHeader text={t('empty_title')} variant="blue" />
            <Text style={styles.subText}>{t('empty_subtitle')}</Text>
            <View style={styles.spacer} />
            <CinemaButton title={t('reset_filters')} onPress={handleResetFilters} />
            <View style={styles.spacer} />
            <CinemaButton title={t('adjust_filters')} type="secondary" onPress={handleAdjustFilters} />
          </View>
        ) : (
        <>
        <Text style={styles.subText}>{t('select_best_movie')}</Text>

        <View style={styles.movieContainer}>
          <MovieCard movieData={{
            name: pair[0]?.title || t('option_a'),
            image: pair[0]?.image_url,
            actor: pair[0]?.actors ? String(pair[0].actors).replace(/[\[\]']/g, '') : "Unknown",
            director: pair[0]?.director || "Unknown",
            overview: pair[0]?.overview,
            year: pair[0]?.release_date ? String(pair[0].release_date).slice(0, 4) : undefined,
            genres: Array.isArray(pair[0]?.genres) ? pair[0].genres.map((g: any) => g.name).filter(Boolean) : [],
            vector: pair[0]?.vector,
            id: pair[0]?.id,
            score: pair[0]?.vote_average,
            selectionHandler: handleSelection,
            detailsHandler: handleDetails
          }} />
          <MovieCard movieData={{
            name: pair[1]?.title || t('option_b'),
            image: pair[1]?.image_url,
            actor: pair[1]?.actors ? String(pair[1].actors).replace(/[\[\]']/g, '') : "Unknown",
            director: pair[1]?.director || "Unknown",
            overview: pair[1]?.overview,
            year: pair[1]?.release_date ? String(pair[1].release_date).slice(0, 4) : undefined,
            genres: Array.isArray(pair[1]?.genres) ? pair[1].genres.map((g: any) => g.name).filter(Boolean) : [],
            vector: pair[1]?.vector,
            id: pair[1]?.id,
            score: pair[1]?.vote_average,
            selectionHandler: handleSelection,
            detailsHandler: handleDetails
          }} />
        </View>
        </>
        )}
        <View style={styles.spacer} />
        <CinemaButton
          title={t('start_over')}
          onPress={handleRequestNewMovies}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailsScreen({ route, navigation }: any) {
  const { stack, clearStack, removeFromStack } = useContext(StackContext);
  const { clearPair } = useContext(PairContext);
  const { clearVector } = useContext(VectorContext);
  const { setSelectedGenres, setMinYear, setMaxYear } = useContext(FiltersContext);
  const { t } = useTranslation();
  const { movie } = route.params || {};

  const handleStartOver = () => {
    clearStack();
    clearVector();
    setSelectedGenres(null);
    setMinYear(MIN_YEAR.toString());
    setMaxYear(MAX_YEAR.toString());
    clearPair();
    navigation.popToTop();
  };
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{ width: '100%' }}>
        {movie ? (
          <View style={styles.ticketBooth}>
            <MarqueeHeader text={t('coming_attractions')} />
            <View style={styles.posterWrap}>
              <Image
                source={{ uri: movie.image }}
                style={{ width: 200, height: 300, borderRadius: 10, borderWidth: 2, borderColor: COLORS.gold }}
                resizeMode="cover"
              />
              {(() => {
                const n = Number(movie.score);
                if (!Number.isFinite(n) || n <= 0) return null;
                return (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>★ {n.toFixed(1)}</Text>
                  </View>
                );
              })()}
            </View>
            <Text style={[styles.text, { fontSize: 30, color: COLORS.gold, textAlign: 'center', marginHorizontal: 20 }]}>
              {movie.name}
            </Text>

            <View style={{ width: '90%', marginVertical: 15, backgroundColor: COLORS.cardBg, padding: 18, borderRadius: 8, borderWidth: 1, borderColor: COLORS.blue }}>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>{t('label_director')}</Text>
                {movie.director || t('unknown')}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>{t('label_starring')}</Text>
                {movie.actor || t('unknown')}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>{t('label_year')}</Text>
                {movie.year || t('unknown')}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 15 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>{t('label_genres')}</Text>
                {movie.genres && movie.genres.length ? movie.genres.join(', ') : t('unknown')}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 15, lineHeight: 24 }}>
                {movie.overview || t('no_overview')}
              </Text>
            </View>
          </View>
        ) : (<Text style={styles.subText}>{t('no_details')}</Text>)}
        {stack.length > 0 && (
          <View style={styles.lineupSection}>
            <View style={styles.lineupCabinet}>
              <MarqueeHeader text={t('now_showing')} variant="blue" containerStyle={styles.lineupHeaderInCabinet} />
              <View style={styles.lineupMarquee}>
              <View style={styles.lineupBoard}>
                {stack.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.lineupRail,
                      index === 0 && styles.lineupRailFirst,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.lineupRailTitleWrap}
                      onPress={() => navigation.push('Details', { movie: item })}
                      activeOpacity={0.5}
                    >
                      <Text
                        style={styles.lineupRailTitle}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {item.name || item}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeFromStack(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.lineupRemove}
                      activeOpacity={0.5}
                    >
                      <Text style={styles.lineupRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
            </View>
          </View>
        )}
        <View style={styles.spacerLarge} />
        <View style={styles.spacerLarge} />
        <CinemaButton
          title={t('back_to_selection')}
          onPress={() => navigation.navigate('Pick a movie')}
        />
        <View style={styles.spacer} />
        <CinemaButton
          title={t('start_over')}
          onPress={handleStartOver}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  const [stack, setStack] = useState<any[]>([]);
  const [pair, setPair] = useState<any[]>([]);
  const [vector, setVector] = useState<number[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [genresList, setGenresList] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[] | null>(null);
  const [minYear, setMinYear] = useState(MIN_YEAR.toString());
  const [maxYear, setMaxYear] = useState(MAX_YEAR.toString());

  // Re-detected each launch (no persistence). `region` is reserved for the
  // streaming-providers row once the backend exposes provider data.
  const { t } = useTranslation();
  const [language, setLanguageState] = useState<string>(detectLanguage());
  const region = detectRegion();
  const setLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLanguageState(lng);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const pushToStack = (item: any) => {
    setStack(prevStack => [...prevStack, item]);
  };

  const removeFromStack = (id: any) => {
    setStack(prevStack => prevStack.filter(item => item?.id !== id));
  };

  const clearStack = () => setStack([]);
  const clearPair = () => setPair([]);
  const clearVector = () => setVector([]);

  useEffect(() => {
    fetch(`${localTest}/details/genres/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(json => {
        let rawData = json.data || json || [];
        setGenres(rawData);

        // Handle if API returns objects [{name: 'Action'}] instead of strings
        if (rawData.length > 0 && typeof rawData[0] === 'object') {
          rawData = rawData.map((g: any) => g.name || g.genre);
        }

        // MAGIC TRICK: 'new Set()' automatically destroys any duplicate values!
        const uniqueGenres = Array.from(new Set(rawData.filter(Boolean))) as string[];

        // Sort alphabetically so the dropdown looks nice
        uniqueGenres.sort();

        setGenresList(uniqueGenres);
      })
      .catch(err => console.error("Could not fetch genres", err));
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LocaleContext.Provider value={{ language, setLanguage, region }}>
      <GenresContext.Provider value={{ genres, setGenres }}>
        <GenresListContext.Provider value={{ genresList, setGenresList }}>
          <VectorContext.Provider value={{ vector, setVector, clearVector }}>
            <FiltersContext.Provider value={{ selectedGenres, setSelectedGenres, minYear, setMinYear, maxYear, setMaxYear }}>
            <StackContext.Provider value={{ stack, pushToStack, removeFromStack, clearStack }}>
              <PairContext.Provider value={{ pair, setPair, clearPair }}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
                <NavigationContainer theme={MyTheme}>
                  <Stack.Navigator
                    initialRouteName="Pick a movie"
                    screenOptions={{
                      headerStyle: { backgroundColor: COLORS.primaryRed },
                      headerTintColor: COLORS.gold,
                      headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
                      headerTitleAlign: 'center',
                      headerRight: () => <LanguageSwitcher />,
                    }}>
                    <Stack.Screen name="Pick a movie" component={SelectionScreen} options={{ title: t('app_title') }} />
                    <Stack.Screen name="Details" component={DetailsScreen} options={{ title: t('details_title') }} />
                  </Stack.Navigator>
                </NavigationContainer>
              </PairContext.Provider>
            </StackContext.Provider>
            </FiltersContext.Provider>
          </VectorContext.Provider>
        </GenresListContext.Provider>
      </GenresContext.Provider>
      </LocaleContext.Provider>
    </SafeAreaProvider>
  );
}

// --- THEME COLORS ---
const COLORS = {
  background: '#13002B', // Space purple
  primaryRed: '#E11D48', // Vibrant red
  gold: '#FACC15',       // Highlight yellow/gold
  textLight: '#F8FAFC',
  cardBg: '#1F0B3B',     // Dark purple
  blue: '#0EA5E9',       // Action blue
  darkBlue: '#0A192F',   // Deep blue
  borderDark: '#5B21B6', // Dark purple border
  marqueeBoard: '#F4EFE2',  // Off-white marquee letterboard
  marqueeRail: '#B8B0A0',   // Grey horizontal letter rails
  marqueeFrame: '#1A1A1A',  // Dark marquee frame
  marqueeInk: '#0B0B0B',    // Black marquee letters
};

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.primaryRed,
    text: COLORS.gold,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIcon: {
    width: 220,
    height: 220,
  },
  langTrigger: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langTriggerText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 14,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  langCard: {
    position: 'absolute',
    top: 56,
    right: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 6,
    minWidth: 140,
  },
  langRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  langRowText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 16,
    color: COLORS.textLight,
  },
  langRowTextActive: {
    color: COLORS.gold,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  posterWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.cardBg + 'E6',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 15,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  movieContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    backgroundColor: COLORS.background,
  },
  movieCard: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: COLORS.background,
  },
  text: {
    fontFamily: 'Oswald-Bold',
    fontSize: 24,
    lineHeight: 28,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginBottom: 10,
  },
  subText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 18,
    lineHeight: 22,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: COLORS.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  marqueeContainer: {
    marginBottom: 40,
    backgroundColor: COLORS.primaryRed,
    padding: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  marqueeBorder: {
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dotted',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 4,
  },
  marqueeText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 28,
    lineHeight: 32,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  marqueeContainerBlue: {
    backgroundColor: COLORS.darkBlue,
    borderColor: COLORS.blue,
    shadowColor: COLORS.blue,
  },
  marqueeBorderBlue: {
    borderColor: COLORS.blue,
  },
  marqueeTextBlue: {
    color: COLORS.textLight,
  },
  ticketBooth: {
    alignItems: 'center',
    width: '100%',
  },
  spacer: { height: 15 },
  spacerLarge: { height: 40 },
  historyItem: {
    fontFamily: 'Limelight-Regular',
    fontSize: 18,
    lineHeight: 22,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: COLORS.textLight,
    marginVertical: 0,
  },
  lineupSection: {
    width: '100%',
    alignItems: 'stretch',
  },
  lineupCabinet: {
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dotted',
    borderRadius: 10,
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  lineupHeaderInCabinet: {
    marginBottom: 12,
  },
  lineupMarquee: {
    width: '100%',
    backgroundColor: COLORS.marqueeFrame,
    padding: 6,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.marqueeFrame,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  lineupBoard: {
    backgroundColor: COLORS.marqueeBoard,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  lineupRail: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.marqueeRail,
    paddingVertical: 8,
  },
  lineupRailFirst: {
    borderTopWidth: 1,
    borderTopColor: COLORS.marqueeRail,
  },
  lineupRailTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  lineupRailTitle: {
    fontFamily: 'Oswald-Bold',
    fontSize: 22,
    lineHeight: 26,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: COLORS.marqueeInk,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  lineupRemove: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lineupRemoveText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 24,
    lineHeight: 28,
    color: COLORS.marqueeInk,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cinemaBtn: {
    borderRadius: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    width: 250,
    height: 60,
    backgroundColor: COLORS.primaryRed,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  btnSecondary: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.darkBlue,
    borderWidth: 2,
    borderColor: COLORS.blue,
  },
  btnInnerBorder: {
    flex: 1,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderStyle: 'dotted',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInnerPrimary: { borderColor: COLORS.gold },
  btnInnerSecondary: { borderColor: COLORS.blue },
  btnText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 16,
    letterSpacing: 1,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  textGold: { color: COLORS.gold },
  textWhite: { color: COLORS.textLight },
  dropdownHeader: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  dropdownHeaderText: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.gold,
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  filtersContainerTop: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 10,
    zIndex: 20,
  },
  filtersContainerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 20,
    zIndex: 10,
  },
  genreTriggerWrap: {
    width: '95%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.gold,
    fontSize: 20,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalList: {
    marginBottom: 12,
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
    margin: 4,
  },
  chipUnselected: {
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: COLORS.gold,
  },
  chipText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.5,
  },
  chipTextUnselected: {
    color: COLORS.gold,
  },
  chipTextSelected: {
    color: COLORS.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  modalAction: {
    fontFamily: 'Limelight-Regular',
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  wheelContainer: {
    width: '45%',
    alignItems: 'center',
  },
  wheelLabel: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginBottom: 4,
  },
  wheelFrame: {
    width: '100%',
    height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT,
    backgroundColor: COLORS.marqueeBoard,
    borderWidth: 2,
    borderColor: COLORS.marqueeFrame,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  wheelCenterHighlight: {
    position: 'absolute',
    top: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT,
    height: WHEEL_ITEM_HEIGHT,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.marqueeRail,
    zIndex: 2,
  },
  wheelDimTop: {
    position: 'absolute',
    top: 0,
    height: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT,
    width: '100%',
    backgroundColor: 'rgba(244, 239, 226, 0.65)',
    zIndex: 1,
  },
  wheelDimBottom: {
    position: 'absolute',
    top: WHEEL_ITEM_HEIGHT * (WHEEL_PAD_COUNT + 1),
    height: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT,
    width: '100%',
    backgroundColor: 'rgba(244, 239, 226, 0.65)',
    zIndex: 1,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.marqueeInk,
    lineHeight: WHEEL_ITEM_HEIGHT,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize: 18,
    letterSpacing: 1.5,
  },
});

export default App;