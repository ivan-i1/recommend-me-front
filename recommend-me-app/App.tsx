/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, { useState, useContext, createContext, useEffect, useRef, use } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Modal } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

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

// --- CUSTOM COMPONENTS ---
const CinemaButton = ({ title, onPress, type = 'primary' }: any) => {
  const isPrimary = type === 'primary';
  return (
    <TouchableOpacity
      style={[
        styles.cinemaBtn,
        isPrimary ? styles.btnPrimary : styles.btnSecondary
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
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
    </TouchableOpacity>
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

const MarqueeHeader = ({ text }: { text: string }) => (
  <View style={styles.marqueeContainer}>
    <View style={styles.marqueeBorder}>
      <Text style={styles.marqueeText}>{text}</Text>
    </View>
  </View>
);

function MovieCard({ movieData }: { movieData: any }) {
  return (
    <View style={styles.movieCard}>
      <View style={{ height: 50, justifyContent: 'flex-end', alignItems: 'center', width: '100%', paddingBottom: 10 }}>
        <Text style={[styles.textGold, styles.text, { textAlign: 'center', marginBottom: 0 }]} numberOfLines={2} adjustsFontSizeToFit>{movieData.name}</Text>
      </View>
      <PosterButton
        imageUri={movieData.image}
        onPress={() => {
          // Changed to pass the entire movieData object instead of just the name
          movieData.selectionHandler(movieData)
        }}
      />
      <CinemaButton
        title="Details"
        type="secondary"
        onPress={() => movieData.detailsHandler(movieData)}
      />
    </View>
  );
}

const CinemaMultiSelectModal = ({ label, options, selectedValues, onChange }: any) => {
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
    ? 'All ▼'
    : noneSelected
      ? 'Any ▼'
      : selectedValues.length === 1
        ? selectedValues[0]
        : `${selectedValues.length} selected`;

  return (
    <View style={styles.genreTriggerWrap}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownHeaderText}>
          <Text style={{ fontWeight: 'bold' }}>{label}: </Text>
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
            <ScrollView style={styles.modalList}>
              {options.map((opt: string) => {
                const checked = isChecked(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    style={styles.modalRow}
                    onPress={() => toggle(opt)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={styles.modalRowText}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={[styles.modalAction, { color: COLORS.primaryRed }]}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={selectNone}>
                <Text style={[styles.modalAction, { color: COLORS.primaryRed }]}>Deselect All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={[styles.modalAction, { color: COLORS.gold }]}>Done</Text>
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

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

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
    setIsLoading(true);
    fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => response.json())
      .then(json => {
        console.log('Got pair:', json)
        setPair(json);
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

    setIsError(false);
    setIsLoading(true);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(response => response.json())
      .then(json => {
        setPair(json);
        setIsLoading(false);
      })
      .catch(error => {
        console.error(error);
        setIsError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (pair.length === 0) {
      requestMoviePair();
    } else {
      setIsLoading(false);
    }
  }, [pair.length]);

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
          <MarqueeHeader text="PROJECTOR JAMMED" />
          <Text style={styles.subText}>Lost connection to the movie server.</Text>
          <View style={styles.spacerLarge} />
          <CinemaButton
            title="Retry Connection"
            onPress={() => requestMoviePair(selectedGenres, minYear, maxYear, vector.length === 0, vector)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || (pair?.length < 2)) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text="LOADING REELS..." />
          <Text style={styles.subText}>Splicing the film...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{ width: '100%' }}>
        <View style={styles.filtersContainerTop}>
          <CinemaMultiSelectModal
            label="Genre"
            options={genresList.length > 0 ? genresList : ['Loading...']}
            selectedValues={selectedGenres}
            onChange={handleGenresChange}
          />
        </View>

        <View style={styles.filtersContainerBottom}>
          <CinemaYearWheel
            label="Min Year"
            value={minYear}
            min={1950}
            max={MAX_YEAR}
            onChange={handleMinYearChange}
          />
          <CinemaYearWheel
            label="Max Year"
            value={maxYear}
            min={1950}
            max={MAX_YEAR}
            onChange={handleMaxYearChange}
          />
        </View>

        <Text style={styles.subText}>Select the best movie</Text>

        <View style={styles.movieContainer}>
          <MovieCard movieData={{
            name: pair[0]?.title || "Option A",
            image: pair[0]?.image_url,
            actor: pair[0]?.actors ? String(pair[0].actors).replace(/[\[\]']/g, '') : "Unknown",
            director: pair[0]?.director || "Unknown",
            overview: pair[0]?.overview,
            year: pair[0]?.release_date ? String(pair[0].release_date).slice(0, 4) : undefined,
            genres: Array.isArray(pair[0]?.genres) ? pair[0].genres.map((g: any) => g.name).filter(Boolean) : [],
            vector: pair[0]?.vector,
            id: pair[0]?.id,
            selectionHandler: handleSelection,
            detailsHandler: handleDetails
          }} />
          <MovieCard movieData={{
            name: pair[1]?.title || "Option B",
            image: pair[1]?.image_url,
            actor: pair[1]?.actors ? String(pair[1].actors).replace(/[\[\]']/g, '') : "Unknown",
            director: pair[1]?.director || "Unknown",
            overview: pair[1]?.overview,
            year: pair[1]?.release_date ? String(pair[1].release_date).slice(0, 4) : undefined,
            genres: Array.isArray(pair[1]?.genres) ? pair[1].genres.map((g: any) => g.name).filter(Boolean) : [],
            vector: pair[1]?.vector,
            id: pair[1]?.id,
            selectionHandler: handleSelection,
            detailsHandler: handleDetails
          }} />
        </View>
        <View style={styles.spacer} />
        <CinemaButton
          title="Start Over"
          onPress={handleRequestNewMovies}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailsScreen({ route, navigation }: any) {
  const { stack, clearStack } = useContext(StackContext);
  const { clearPair } = useContext(PairContext);
  const { clearVector } = useContext(VectorContext);
  const { setSelectedGenres, setMinYear, setMaxYear } = useContext(FiltersContext);
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
            <MarqueeHeader text="NOW SHOWING" />
            <Image
              source={{ uri: movie.image }}
              style={{ width: 200, height: 300, borderRadius: 10, borderWidth: 2, borderColor: COLORS.gold, marginBottom: 20 }}
              resizeMode="cover"
            />
            <Text style={[styles.text, { fontSize: 30, color: COLORS.gold, textAlign: 'center', marginHorizontal: 20 }]}>
              {movie.name}
            </Text>

            <View style={{ width: '90%', marginVertical: 15, backgroundColor: COLORS.cardBg, padding: 18, borderRadius: 8, borderWidth: 1, borderColor: COLORS.blue }}>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>Director: </Text>
                {movie.director || 'Unknown'}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>Starring: </Text>
                {movie.actor || 'Unknown'}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>Year: </Text>
                {movie.year || 'Unknown'}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 15 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>Genres: </Text>
                {movie.genres && movie.genres.length ? movie.genres.join(', ') : 'Unknown'}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 15, lineHeight: 24 }}>
                {movie.overview || 'No plot overview available for this title.'}
              </Text>
            </View>
          </View>
        ) : (<Text style={styles.subText}>No movie details available.</Text>)}
        <View style={styles.receiptContainer}>
          <MarqueeHeader text="TONIGHT'S LINEUP" />
          {stack.length === 0 ? (
            <Text style={styles.historyItem}>No choices made yet.</Text>
          ) : (
            stack.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => navigation.push('Details', { movie: item })}
                activeOpacity={0.6}
              >
                <Text style={[styles.historyItem, styles.lineupLink]}>
                  {index + 1}. {item.name || item}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={styles.spacerLarge} />
        <View style={styles.spacerLarge} />
        <CinemaButton
          title="Back to Selection"
          onPress={() => navigation.navigate('Pick a movie')}
        />
        <View style={styles.spacer} />
        <CinemaButton
          title="Start Over"
          onPress={handleStartOver}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  const [stack, setStack] = useState<any[]>([]);
  const [pair, setPair] = useState<any[]>([]);
  const [vector, setVector] = useState<number[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [genresList, setGenresList] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[] | null>(null);
  const [minYear, setMinYear] = useState(MIN_YEAR.toString());
  const [maxYear, setMaxYear] = useState(MAX_YEAR.toString());

  const pushToStack = (item: any) => {
    setStack(prevStack => [...prevStack, item]);
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

  return (
    <SafeAreaProvider>
      <GenresContext.Provider value={{ genres, setGenres }}>
        <GenresListContext.Provider value={{ genresList, setGenresList }}>
          <VectorContext.Provider value={{ vector, setVector, clearVector }}>
            <FiltersContext.Provider value={{ selectedGenres, setSelectedGenres, minYear, setMinYear, maxYear, setMaxYear }}>
            <StackContext.Provider value={{ stack, pushToStack, clearStack }}>
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
                    }}>
                    <Stack.Screen name="Pick a movie" component={SelectionScreen} options={{ title: 'RECOMMEND ME!' }} />
                    <Stack.Screen name="Details" component={DetailsScreen} options={{ title: 'MOVIE DETAILS' }} />
                  </Stack.Navigator>
                </NavigationContainer>
              </PairContext.Provider>
            </StackContext.Provider>
            </FiltersContext.Provider>
          </VectorContext.Provider>
        </GenresListContext.Provider>
      </GenresContext.Provider>
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
    fontFamily: 'Limelight-Regular',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subText: {
    fontFamily: 'Limelight-Regular',
    fontSize: 18,
    fontWeight: 'bold',
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
    fontFamily: 'Limelight-Regular',
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
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
    color: COLORS.textLight,
    marginVertical: 0,
  },
  lineupLink: {
    color: COLORS.gold,
    textDecorationLine: 'underline',
    paddingVertical: 4,
  },
  receiptContainer: {
    backgroundColor: COLORS.cardBg,
    padding: 20,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryRed,
    alignItems: 'center',
  },
  cinemaBtn: {
    borderRadius: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 5,
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
    textAlign: 'center',
    marginBottom: 12,
  },
  modalList: {
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#5B21B6',
  },
  modalRowText: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.textLight,
    fontSize: 16,
    marginLeft: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.gold,
  },
  checkboxMark: {
    color: COLORS.cardBg,
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  wheelContainer: {
    width: '45%',
    alignItems: 'center',
  },
  wheelLabel: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  wheelFrame: {
    width: '100%',
    height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.gold,
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
    borderColor: COLORS.gold,
    zIndex: 2,
  },
  wheelDimTop: {
    position: 'absolute',
    top: 0,
    height: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT,
    width: '100%',
    backgroundColor: 'rgba(31, 11, 59, 0.55)',
    zIndex: 1,
  },
  wheelDimBottom: {
    position: 'absolute',
    top: WHEEL_ITEM_HEIGHT * (WHEEL_PAD_COUNT + 1),
    height: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT,
    width: '100%',
    backgroundColor: 'rgba(31, 11, 59, 0.55)',
    zIndex: 1,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.gold,
    fontSize: 16,
  },
});

export default App;