/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, { useState, useContext, createContext, useEffect, useRef, use } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Modal, Pressable, Linking, TextInput } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { useTranslation } from 'react-i18next';
import i18n, { detectLanguage, detectRegion } from './src/i18n';

const localTest = Platform.OS === 'web'
  ? ''
  : 'http://188.166.155.92';

// Default region sent to the backend (country_code) when the device locale
// exposes no region. The API requires a country_code for provider availability.
const DEFAULT_COUNTRY_CODE = 'US';
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
  // Story 3 side-panel filters. Providers/languages/country use lookup lists;
  // actors/directors are stored as {id, name} so chips can show the name while
  // only the id is sent to the API.
  // Providers/languages use the chip-cloud "all" sentinel: null = all/unfiltered,
  // [] = none, non-empty array = explicit subset. Both null and [] mean
  // "no constraint" when building the request.
  selectedProviders: null as number[] | null,
  setSelectedProviders: (vals: number[] | null) => { },
  selectedLanguages: null as string[] | null,
  setSelectedLanguages: (vals: string[] | null) => { },
  selectedCountry: '' as string,
  setSelectedCountry: (val: string) => { },
  selectedActors: [] as any[],
  setSelectedActors: (vals: any[]) => { },
  selectedDirectors: [] as any[],
  setSelectedDirectors: (vals: any[]) => { },
});

// Lookup lists for the filter side panel (providers / countries / languages),
// fetched once on mount alongside genres.
const FilterOptionsContext = createContext({
  providers: [] as any[],
  countries: [] as any[],
  languages: [] as any[],
});

// Holds only the filter side-panel open/close state, lifted to App() level so the
// nav-bar FilterTrigger (rendered by the navigator, outside SelectionScreen) can
// open the panel that SelectionScreen renders.
const FilterUIContext = createContext({
  isPanelOpen: false,
  openPanel: () => { },
  closePanel: () => { },
});

const LocaleContext = createContext({
  language: 'en',
  setLanguage: (_lng: string) => { },
  region: '',
});

// Single source of truth for the active side-panel filter count (badge on the
// nav-bar FilterTrigger). Providers/languages count only when an explicit
// non-empty subset is chosen (null = all and [] = none both count as 0);
// country counts when set; actors/directors by length.
function countExtraFilters(filters: {
  selectedProviders: number[] | null;
  selectedLanguages: string[] | null;
  selectedCountry: string;
  selectedActors: any[];
  selectedDirectors: any[];
}): number {
  const providerCount = Array.isArray(filters.selectedProviders) ? filters.selectedProviders.length : 0;
  const languageCount = Array.isArray(filters.selectedLanguages) ? filters.selectedLanguages.length : 0;
  return (
    providerCount +
    languageCount +
    (filters.selectedActors || []).length +
    (filters.selectedDirectors || []).length +
    (filters.selectedCountry ? 1 : 0)
  );
}

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

// Pulls the 11-char YouTube video id out of watch?v=, youtu.be/, or /embed/ urls.
function extractYouTubeId(url: any): string | null {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,       // https://www.youtube.com/watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/,  // https://youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/,    // https://www.youtube.com/embed/ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function TrailerPlayer({ url }: { url: string }) {
  const { t } = useTranslation();
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  return (
    <View style={styles.trailerSection}>
      <Text style={styles.trailerHeading}>{t('trailer_heading')}</Text>
      {Platform.OS === 'web' ? (
        <View style={styles.trailerFrame}>
          {React.createElement('iframe', {
            src: `https://www.youtube.com/embed/${videoId}`,
            width: '100%',
            height: '100%',
            frameBorder: '0',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowFullScreen: true,
            style: { border: 0, borderRadius: 8 },
          })}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.trailerButton}
          onPress={() => Linking.openURL(url)}
          activeOpacity={0.7}
        >
          <Text style={styles.trailerPlayGlyph}>▶</Text>
          <Text style={styles.trailerButtonText}>{t('watch_trailer')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

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

// Nav-bar trigger that opens the filter menu, mirroring LanguageSwitcher's
// gold-on-red glyph styling. Badge reuses filtersBadge*; count via the shared
// countExtraFilters helper so it stays in sync with SelectionScreen.
function FilterTrigger() {
  const { openPanel } = useContext(FilterUIContext);
  const {
    selectedProviders, selectedLanguages, selectedCountry,
    selectedActors, selectedDirectors,
  } = useContext(FiltersContext);
  const count = countExtraFilters({
    selectedProviders, selectedLanguages, selectedCountry,
    selectedActors, selectedDirectors,
  });
  return (
    <TouchableOpacity
      onPress={openPanel}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.langTrigger}
      activeOpacity={0.7}
    >
      <Text style={styles.langTriggerText}>▤</Text>
      {count > 0 && (
        <View style={styles.filtersBadge}>
          <Text style={styles.filtersBadgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
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

// Genre-style chip-cloud multi-select. `selectedValues` uses the "all" sentinel:
// null = all selected, [] = none, non-empty array = explicit subset.
// `getValue`/`getLabel` default to identity so plain-string usage (genres) keeps
// working; pass them to drive object-based lookup lists (providers/languages).
const CinemaMultiSelectModal = ({
  label,
  options,
  selectedValues,
  onChange,
  getValue = (o: any) => o,
  getLabel = (o: any) => o,
}: any) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const allSelected = selectedValues === null;
  const noneSelected = Array.isArray(selectedValues) && selectedValues.length === 0;
  const isChecked = (opt: any) => allSelected || (selectedValues || []).includes(getValue(opt));

  const toggle = (opt: any) => {
    const val = getValue(opt);
    let next: any[];
    if (allSelected) {
      next = options.map(getValue).filter((v: any) => v !== val);
    } else if (selectedValues.includes(val)) {
      next = selectedValues.filter((v: any) => v !== val);
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

  // Label shown for the single-selected case: find the option whose value matches.
  const singleLabel = () => {
    const opt = options.find((o: any) => getValue(o) === selectedValues[0]);
    return opt !== undefined ? getLabel(opt) : String(selectedValues[0]);
  };

  const valueText = allSelected
    ? `${t('filter_all')} ▼`
    : noneSelected
      ? `${t('filter_any')} ▼`
      : selectedValues.length === 1
        ? singleLabel()
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
              {options.map((opt: any) => {
                const checked = isChecked(opt);
                return (
                  <TouchableOpacity
                    key={String(getValue(opt))}
                    style={[styles.chip, checked ? styles.chipSelected : styles.chipUnselected]}
                    onPress={() => toggle(opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, checked ? styles.chipTextSelected : styles.chipTextUnselected]}>
                      {getLabel(opt)}
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

// --- FILTER SIDE PANEL HELPERS ---

// Single-select for lookup lists (used by Country).
const PanelSingleSelect = ({ label, options, selectedValue, getValue, getLabel, onChange }: any) => {
  return (
    <View style={styles.panelSection}>
      <Text style={styles.panelSectionTitle}>{label}</Text>
      <View style={styles.chipCloud}>
        {options.map((opt: any) => {
          const val = getValue(opt);
          const checked = val === selectedValue;
          return (
            <TouchableOpacity
              key={String(val)}
              style={[styles.chip, checked ? styles.chipSelected : styles.chipUnselected]}
              onPress={() => onChange(val)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, checked ? styles.chipTextSelected : styles.chipTextUnselected]}>
                {getLabel(opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Min characters before a typeahead query fires, debounce window, and the cap on
// rendered suggestions.
const TYPEAHEAD_MIN_CHARS = 2;
const TYPEAHEAD_DEBOUNCE_MS = 300;
const TYPEAHEAD_MAX_RESULTS = 8;

// Debounced typeahead multi-select used for both Cast and Directors. `selected`
// is an array of {id, name}; only ids are sent to the search endpoint and (later)
// to the movie request. `endpoint` is the search path; `selectedParam` is the
// query-string key that carries already-selected ids back to the server.
const PanelTypeahead = ({ label, selected, onChange, endpoint, selectedParam }: any) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<any>(null);

  const selectedIds = (selected || []).map((s: any) => s.id);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < TYPEAHEAD_MIN_CHARS) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timerRef.current = setTimeout(() => {
      const selectedEncoded = encodeURIComponent('[' + selectedIds.join(',') + ']');
      const url = `${localTest}${endpoint}?q=${encodeURIComponent(query.trim())}&${selectedParam}=${selectedEncoded}`;
      fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
        .then(res => res.json())
        .then(json => {
          const list = Array.isArray(json) ? json : (json?.data || []);
          setResults(list.slice(0, TYPEAHEAD_MAX_RESULTS));
          setSearching(false);
        })
        .catch(err => {
          console.error('Typeahead search failed', err);
          setResults([]);
          setSearching(false);
        });
    }, TYPEAHEAD_DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // selectedIds is derived from `selected`; depending on it would refire on each pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const addPerson = (person: any) => {
    if (!selectedIds.includes(person.id)) {
      onChange([...(selected || []), { id: person.id, name: person.name }]);
    }
    setQuery('');
    setResults([]);
  };

  const removePerson = (id: any) => {
    onChange((selected || []).filter((s: any) => s.id !== id));
  };

  return (
    <View style={styles.panelSection}>
      <Text style={styles.panelSectionTitle}>{label}</Text>

      {(selected || []).length > 0 && (
        <View style={styles.chipCloud}>
          {(selected || []).map((person: any) => (
            <TouchableOpacity
              key={String(person.id)}
              style={[styles.chip, styles.chipSelected]}
              onPress={() => removePerson(person.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, styles.chipTextSelected]}>{person.name}  ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TextInput
        style={styles.panelInput}
        placeholder={t('filter_search_placeholder')}
        placeholderTextColor={COLORS.borderDark}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="words"
      />

      {searching && <Text style={styles.panelHint}>{t('filter_searching')}</Text>}
      {!searching && query.trim().length >= TYPEAHEAD_MIN_CHARS && results.length === 0 && (
        <Text style={styles.panelHint}>{t('filter_no_results')}</Text>
      )}

      {results.map((person: any) => (
        <TouchableOpacity
          key={String(person.id)}
          style={styles.typeaheadResult}
          onPress={() => addPerson(person)}
          activeOpacity={0.7}
        >
          <Text style={styles.typeaheadResultName}>{person.name}</Text>
          {person.movie_count != null && (
            <Text style={styles.typeaheadResultMeta}>
              {t('filter_movie_count', { count: person.movie_count })}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Dropdown menu hosting the Story 3 filters (providers / language / country
// / cast / directors). Mirrors LanguageSwitcher's modalBackdrop + anchored card
// pattern: a fade Modal with a backdrop Pressable that closes on outside tap.
// Values are staged in FiltersContext; only the bottom Apply button refetches.
const FilterMenu = ({ visible, onClose, onApply }: any) => {
  const { t } = useTranslation();
  const { providers, countries, languages } = useContext(FilterOptionsContext);
  const {
    selectedProviders, setSelectedProviders,
    selectedLanguages, setSelectedLanguages,
    selectedCountry, setSelectedCountry,
    selectedActors, setSelectedActors,
    selectedDirectors, setSelectedDirectors,
  } = useContext(FiltersContext);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        {/* Stop propagation so taps inside the card don't close the menu. */}
        <Pressable style={styles.filterMenuCard} onPress={() => {}}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{t('filters_panel_title')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.panelClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.panelBody} contentContainerStyle={styles.panelBodyContent}>
            <View style={styles.panelSection}>
              <CinemaMultiSelectModal
                label={t('filter_providers')}
                options={providers}
                selectedValues={selectedProviders}
                getValue={(p: any) => p.id}
                getLabel={(p: any) => p.name}
                onChange={setSelectedProviders}
              />
            </View>
            <View style={styles.panelSection}>
              <CinemaMultiSelectModal
                label={t('filter_language')}
                options={languages}
                selectedValues={selectedLanguages}
                getValue={(l: any) => l.code}
                getLabel={(l: any) => l.native_name || l.english_name || l.code}
                onChange={setSelectedLanguages}
              />
            </View>
            <PanelSingleSelect
              label={t('filter_country')}
              options={countries}
              selectedValue={selectedCountry}
              getValue={(c: any) => c.code}
              getLabel={(c: any) => c.name}
              onChange={setSelectedCountry}
            />
            <PanelTypeahead
              label={t('filter_actors')}
              selected={selectedActors}
              onChange={setSelectedActors}
              endpoint="/details/searchActor"
              selectedParam="actors_selected"
            />
            <PanelTypeahead
              label={t('filter_directors')}
              selected={selectedDirectors}
              onChange={setSelectedDirectors}
              endpoint="/details/searchDirector"
              selectedParam="directors_selected"
            />
          </ScrollView>

          <View style={styles.panelFooter}>
            <CinemaButton title={t('filter_apply')} onPress={onApply} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
  const {
    selectedGenres, setSelectedGenres, minYear, setMinYear, maxYear, setMaxYear,
    selectedProviders, selectedLanguages, selectedCountry,
    setSelectedProviders, setSelectedLanguages, setSelectedCountry,
    selectedActors, setSelectedActors, selectedDirectors, setSelectedDirectors,
  } = useContext(FiltersContext);
  const { region } = useContext(LocaleContext);
  const { t } = useTranslation();

  // ISO country sent to the backend for provider availability. The panel's
  // explicit country selection wins; otherwise fall back to the detected region,
  // then to the default.
  const countryCode = selectedCountry || region || DEFAULT_COUNTRY_CODE;

  // Ids extracted from the {id,name} actor/director objects for the API.
  const actorIds = (selectedActors || []).map((a: any) => a.id);
  const directorIds = (selectedDirectors || []).map((d: any) => d.id);

  const { isPanelOpen, closePanel } = useContext(FilterUIContext);

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
    params.push(`country_code=${encodeURIComponent(countryCode)}`);
    // Story 3 side-panel filters. Per the API spec start_movies does NOT accept
    // original_language, so it is intentionally omitted here (applied on the POST
    // body only — see requestMoviePostPair).
    params.push(`providers=${encodeURIComponent('[' + (selectedProviders || []).join(',') + ']')}`);
    params.push(`actors=${encodeURIComponent('[' + actorIds.join(',') + ']')}`);
    params.push(`directors=${encodeURIComponent('[' + directorIds.join(',') + ']')}`);

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
      ids: currentIds.filter(Boolean),
      country_code: countryCode,
      // Story 3 side-panel filters. original_language is POST-only (start_movies
      // GET does not accept it per the API spec).
      original_language: (selectedLanguages || []) as string[],
      providers: (selectedProviders || []) as number[],
      actors: actorIds as number[],
      directors: directorIds as number[],
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

  // requestMoviePair reads provider/actor/etc straight from the FiltersContext
  // closure, so a reset that clears them and requests in the same render would
  // fire with stale values. This flag defers the request to the next render,
  // after the cleared values have landed.
  const [pendingResetRequest, setPendingResetRequest] = useState(false);
  useEffect(() => {
    if (pendingResetRequest) {
      setPendingResetRequest(false);
      requestMoviePair(selectedGenres, minYear, maxYear, true, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingResetRequest]);

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
    // "Start Over" clears the extra side-panel filters (keeps genre + year), then
    // refetches. Deferred via the pending flag so the request sees the cleared
    // values rather than the stale closure (same pattern as Reset Filters).
    clearExtraFilters();
    setPendingResetRequest(true);
  };

  // Clears ONLY the Story 3 side-panel filters (providers / language / country /
  // cast / directors), leaving genre + year range intact. Country resets to ''
  // so it falls back to the detected region again.
  const clearExtraFilters = () => {
    setSelectedProviders(null);
    setSelectedLanguages(null);
    setSelectedCountry('');
    setSelectedActors([]);
    setSelectedDirectors([]);
  };

  // No-results recovery action. Per spec, "Reset Filters" clears only the extra
  // director/actor/language/country/provider filters (keeping genre + years),
  // then re-requests with the surviving genre + year staging.
  const handleResetFilters = () => {
    clearExtraFilters();
    clearStack();
    clearVector();
    setPendingResetRequest(true);
  };

  const handleAdjustFilters = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Side-panel "Apply": closes the drawer and immediately fetches a fresh pair
  // using the current filters (incl. the just-set provider/cast/etc selections).
  // Dismissing via the scrim or ✕ only closes — it does not fetch.
  const handleApplyFilters = () => {
    closePanel();
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

        <FilterMenu visible={isPanelOpen} onClose={closePanel} onApply={handleApplyFilters} />

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
          title={t('see_recommendations')}
          type="secondary"
          onPress={() => navigation.navigate('Recommendations')}
        />
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
  const {
    setSelectedGenres, setMinYear, setMaxYear,
    setSelectedProviders, setSelectedLanguages, setSelectedCountry,
    setSelectedActors, setSelectedDirectors,
  } = useContext(FiltersContext);
  const { t } = useTranslation();
  const { movie } = route.params || {};

  const handleStartOver = () => {
    clearStack();
    clearVector();
    setSelectedGenres(null);
    setMinYear(MIN_YEAR.toString());
    setMaxYear(MAX_YEAR.toString());
    // Start Over also clears the extra side-panel filters.
    setSelectedProviders(null);
    setSelectedLanguages(null);
    setSelectedCountry('');
    setSelectedActors([]);
    setSelectedDirectors([]);
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
                    <Text style={styles.ratingStar}>★</Text>
                    <Text style={styles.ratingText}>{n.toFixed(1)}</Text>
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
            <TrailerPlayer url={movie.trailer_path} />
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

function RecommendationsScreen({ navigation }: any) {
  const { vector } = useContext(VectorContext);
  const { stack, removeFromStack } = useContext(StackContext);
  const { genres } = useContext(GenresContext);
  const {
    selectedGenres, minYear, maxYear,
    selectedProviders, selectedLanguages, selectedCountry,
    selectedActors, selectedDirectors,
  } = useContext(FiltersContext);
  const { region } = useContext(LocaleContext);
  const { t } = useTranslation();

  const countryCode = selectedCountry || region || DEFAULT_COUNTRY_CODE;
  const actorIds = (selectedActors || []).map((a: any) => a.id);
  const directorIds = (selectedDirectors || []).map((d: any) => d.id);

  const [recs, setRecs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const hasVector = vector.length === 43;

  const requestRecommendations = () => {
    const genreIds = (selectedGenres ?? [])
      .map((name: string) => genres.find((g: any) => g?.name?.toLowerCase() === name.toLowerCase())?.id)
      .filter((id: any) => id !== undefined && id !== null) as number[];

    // Body mirrors requestMoviePostPair's two_options payload verbatim.
    const body = {
      vector: vector.length === 43 ? vector : [],
      min_year: minYear && minYear.length === 4 ? parseInt(minYear) : MIN_YEAR,
      max_year: maxYear && maxYear.length === 4 ? parseInt(maxYear) : MAX_YEAR,
      genres: genreIds,
      adult: 0,
      ids: stack.map((s: any) => s.id).filter(Boolean),
      country_code: countryCode,
      original_language: (selectedLanguages || []) as string[],
      providers: (selectedProviders || []) as number[],
      actors: actorIds as number[],
      directors: directorIds as number[],
    };

    setIsError(false);
    setIsLoading(true);
    fetch(`${localTest}/movies/twelve_options/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(response => response.json())
      .then(json => {
        setRecs(Array.isArray(json) ? json.slice(0, 4) : []);
        setIsLoading(false);
      })
      .catch(error => {
        console.error(error);
        setIsError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (hasVector) {
      requestRecommendations();
    } else {
      setRecs([]);
    }
    // requestRecommendations reads filter values from the context closure; we
    // refetch on vector change (the running pick), guarded by hasVector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vector]);

  // Maps a raw twelve_options object to the MovieCard-mapped shape DetailsScreen
  // expects (same mapping SelectionScreen uses for MovieCard).
  const goToDetails = (rec: any) => {
    navigation.push('Details', {
      movie: {
        name: rec?.title,
        image: rec?.image_url,
        actor: rec?.actors ? String(rec.actors).replace(/[\[\]']/g, '') : 'Unknown',
        director: rec?.director || 'Unknown',
        overview: rec?.overview,
        year: rec?.release_date ? String(rec.release_date).slice(0, 4) : undefined,
        genres: Array.isArray(rec?.genres) ? rec.genres.map((g: any) => g.name).filter(Boolean) : [],
        vector: rec?.vector,
        id: rec?.id,
        score: rec?.vote_average,
        trailer_path: rec?.trailer_path,
      },
    });
  };

  // Cold start: no running pick yet — placeholder CTA, no endpoint call.
  if (!hasVector) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text={t('rec_empty_title')} />
          <Text style={styles.subText}>{t('rec_empty_subtitle')}</Text>
          <View style={styles.spacer} />
          <CinemaButton
            title={t('back_to_selection')}
            onPress={() => navigation.navigate('Pick a movie')}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text={t('error_title')} />
          <Text style={styles.subText}>{t('error_subtitle')}</Text>
          <View style={styles.spacerLarge} />
          <CinemaButton title={t('retry_connection')} onPress={requestRecommendations} />
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

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{ width: '100%' }}>
        <MarqueeHeader text={t('your_recommendations')} />
        <View style={styles.recRow}>
          {recs.map((rec: any, index: number) => (
            <View key={rec?.id ?? index} style={styles.recCell}>
              <PosterButton imageUri={rec?.image_url} onPress={() => goToDetails(rec)} />
            </View>
          ))}
        </View>

        {stack.length > 0 && (
          <View style={styles.lineupSection}>
            <View style={styles.lineupCabinet}>
              <MarqueeHeader text={t('now_showing')} variant="blue" containerStyle={styles.lineupHeaderInCabinet} />
              <View style={styles.recCloud}>
                {stack.map((item: any, index: number) => (
                  <View key={item?.id ?? index} style={styles.recCloudCell}>
                    <PosterButton
                      imageUri={item.image}
                      onPress={() => navigation.push('Details', { movie: item })}
                    />
                    <TouchableOpacity
                      onPress={() => removeFromStack(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.recRemove}
                      activeOpacity={0.5}
                    >
                      <Text style={styles.recRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.spacerLarge} />
        <CinemaButton
          title={t('back_to_selection')}
          onPress={() => navigation.navigate('Pick a movie')}
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

  // Story 3 side-panel filter state. Actors/directors hold {id, name} objects so
  // chips can show names while only ids are sent to the API.
  const [selectedProviders, setSelectedProviders] = useState<number[] | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[] | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedActors, setSelectedActors] = useState<any[]>([]);
  const [selectedDirectors, setSelectedDirectors] = useState<any[]>([]);

  // Filter menu open/close state, lifted to App() so the nav-bar FilterTrigger
  // (rendered by the navigator) can open the menu that SelectionScreen renders.
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const openPanel = () => setIsPanelOpen(true);
  const closePanel = () => setIsPanelOpen(false);

  // Lookup lists for the side panel, fetched once on mount.
  const [providerOptions, setProviderOptions] = useState<any[]>([]);
  const [countryOptions, setCountryOptions] = useState<any[]>([]);
  const [languageOptions, setLanguageOptions] = useState<any[]>([]);

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

  // Fetch the side-panel lookup lists once on mount. NOTE: the languages endpoint
  // path is the backend's misspelling "lenguages" (intentional, not a typo here).
  useEffect(() => {
    const loadList = (path: string, setter: (v: any[]) => void, label: string) => {
      fetch(`${localTest}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(res => res.json())
        .then(json => setter(Array.isArray(json) ? json : (json?.data || [])))
        .catch(err => console.error(`Could not fetch ${label}`, err));
    };
    loadList('/details/providers', setProviderOptions, 'providers');
    loadList('/details/countries', setCountryOptions, 'countries');
    loadList('/details/lenguages', setLanguageOptions, 'languages');
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
            <FiltersContext.Provider value={{
              selectedGenres, setSelectedGenres, minYear, setMinYear, maxYear, setMaxYear,
              selectedProviders, setSelectedProviders,
              selectedLanguages, setSelectedLanguages,
              selectedCountry, setSelectedCountry,
              selectedActors, setSelectedActors,
              selectedDirectors, setSelectedDirectors,
            }}>
            <FilterOptionsContext.Provider value={{ providers: providerOptions, countries: countryOptions, languages: languageOptions }}>
            <FilterUIContext.Provider value={{ isPanelOpen, openPanel, closePanel }}>
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
                    <Stack.Screen
                      name="Pick a movie"
                      component={SelectionScreen}
                      options={{
                        title: t('app_title'),
                        // Filters live only on the selection screen, so override the
                        // global language-only headerRight to show the FilterTrigger
                        // to the LEFT of the LanguageSwitcher here.
                        headerRight: () => (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FilterTrigger />
                            <LanguageSwitcher />
                          </View>
                        ),
                      }}
                    />
                    <Stack.Screen name="Details" component={DetailsScreen} options={{ title: t('details_title') }} />
                    <Stack.Screen name="Recommendations" component={RecommendationsScreen} options={{ title: t('recommendations_title') }} />
                  </Stack.Navigator>
                </NavigationContainer>
              </PairContext.Provider>
            </StackContext.Provider>
            </FilterUIContext.Provider>
            </FilterOptionsContext.Provider>
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
  trailerSection: {
    width: '90%',
    alignItems: 'center',
    marginBottom: 15,
  },
  trailerHeading: {
    fontFamily: 'Oswald-Bold',
    fontSize: 16,
    color: COLORS.gold,
    letterSpacing: 2,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  trailerFrame: {
    width: '100%',
    maxWidth: 380,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.blue,
    backgroundColor: COLORS.darkBlue,
    overflow: 'hidden',
  },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    maxWidth: 380,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryRed,
    backgroundColor: COLORS.cardBg,
  },
  trailerPlayGlyph: {
    color: COLORS.primaryRed,
    fontSize: 18,
    marginRight: 10,
  },
  trailerButtonText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 15,
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  splashIcon: {
    width: 220,
    height: 220,
  },
  langTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStar: {
    fontSize: 14,
    color: COLORS.gold,
    marginRight: 3,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  ratingText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 15,
    color: COLORS.gold,
    letterSpacing: 0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
  recRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  recCell: {
    flex: 1,
    marginHorizontal: 4,
  },
  recCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  recCloudCell: {
    width: '30%',
    marginHorizontal: '1.5%',
    position: 'relative',
  },
  recRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.cardBg + 'E6',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recRemoveText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 22,
    lineHeight: 24,
    color: COLORS.gold,
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

  // --- FILTER SIDE PANEL ---
  filtersBadge: {
    marginLeft: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersBadgeText: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Dropdown menu card: anchored near the top (under the header), mirroring
  // LanguageSwitcher's langCard. modalBackdrop centers, so override with
  // top alignment + marginTop to pin it below the nav bar.
  filterMenuCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    alignSelf: 'center',
    marginTop: 48,
    marginBottom: 'auto',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    overflow: 'hidden',
    paddingTop: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  panelTitle: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.gold,
    fontSize: 20,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 1,
  },
  panelClose: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.gold,
    fontSize: 22,
    lineHeight: 26,
    includeFontPadding: false,
    paddingHorizontal: 6,
  },
  panelBody: {
    flex: 1,
  },
  panelBodyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  panelSection: {
    marginBottom: 22,
  },
  panelSectionTitle: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.textLight,
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  panelInput: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 4,
    color: COLORS.textLight,
    fontFamily: 'Oswald-Bold',
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  panelHint: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.borderDark,
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    marginTop: 8,
  },
  typeaheadResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  typeaheadResultName: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.gold,
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
    flexShrink: 1,
  },
  typeaheadResultMeta: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.blue,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    marginLeft: 8,
  },
  panelFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
    alignItems: 'center',
  },
});

export default App;