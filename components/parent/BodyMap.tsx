import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import type { BodyArea } from '@/lib/types';

interface BodyMapProps {
  selected: BodyArea[];
  onToggle: (area: BodyArea) => void;
}

const SELECTED = '#ff4444';
const DEFAULT = '#d8d8d8';
const STROKE = '#888';
const SW = '1';

function fill(area: BodyArea, selected: BodyArea[]) {
  return selected.includes(area) ? SELECTED : DEFAULT;
}

function BodyFigure({
  view,
  selected,
  onToggle,
}: {
  view: 'front' | 'back';
  selected: BodyArea[];
  onToggle: (area: BodyArea) => void;
}) {
  const isFront = view === 'front';
  const f = (area: BodyArea) => fill(area, selected);

  return (
    <Svg width={90} height={210} viewBox="0 0 100 220">
      {/* Scalp / head outline */}
      <Circle
        cx={50} cy={18} r={14}
        fill={f('scalp')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('scalp')}
      />

      {/* Face overlay (front only) */}
      {isFront && (
        <Circle
          cx={50} cy={20} r={8}
          fill={f('face')} stroke={STROKE} strokeWidth={SW}
          onPress={() => onToggle('face')}
        />
      )}

      {/* Neck */}
      <Rect
        x={44} y={31} width={12} height={10} rx={3}
        fill={f('neck')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('neck')}
      />

      {/* Torso */}
      <Path
        d="M30 42 Q25 44 24 60 L24 90 Q24 94 30 95 L70 95 Q76 94 76 90 L76 60 Q75 44 70 42 Z"
        fill={f(isFront ? 'chest' : 'back')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle(isFront ? 'chest' : 'back')}
      />

      {/* Left arm */}
      <Path
        d="M24 44 Q16 46 14 62 L14 88 Q14 92 18 92 L24 92 Z"
        fill={f('arms')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('arms')}
      />

      {/* Right arm */}
      <Path
        d="M76 44 Q84 46 86 62 L86 88 Q86 92 82 92 L76 92 Z"
        fill={f('arms')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('arms')}
      />

      {/* Left hand */}
      <Ellipse
        cx={16} cy={98} rx={6} ry={8}
        fill={f('hands')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('hands')}
      />

      {/* Right hand */}
      <Ellipse
        cx={84} cy={98} rx={6} ry={8}
        fill={f('hands')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('hands')}
      />

      {/* Left leg */}
      <Path
        d="M30 95 L30 165 Q30 168 34 168 L44 168 Q48 168 48 165 L48 95 Z"
        fill={f('legs')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('legs')}
      />

      {/* Right leg */}
      <Path
        d="M70 95 L70 165 Q70 168 66 168 L56 168 Q52 168 52 165 L52 95 Z"
        fill={f('legs')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('legs')}
      />

      {/* Left foot */}
      <Ellipse
        cx={34} cy={174} rx={9} ry={5}
        fill={f('feet')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('feet')}
      />

      {/* Right foot */}
      <Ellipse
        cx={66} cy={174} rx={9} ry={5}
        fill={f('feet')} stroke={STROKE} strokeWidth={SW}
        onPress={() => onToggle('feet')}
      />
    </Svg>
  );
}

const LEGEND: { area: BodyArea; label: string }[] = [
  { area: 'scalp', label: 'Scalp' },
  { area: 'face', label: 'Face' },
  { area: 'neck', label: 'Neck' },
  { area: 'chest', label: 'Chest' },
  { area: 'back', label: 'Back' },
  { area: 'arms', label: 'Arms' },
  { area: 'hands', label: 'Hands' },
  { area: 'legs', label: 'Legs' },
  { area: 'feet', label: 'Feet' },
  { area: 'other', label: 'Other' },
];

export function BodyMap({ selected, onToggle }: BodyMapProps) {
  return (
    <View>
      <View style={styles.figureRow}>
        <View style={styles.figureCol}>
          <BodyFigure view="front" selected={selected} onToggle={onToggle} />
          <Text style={styles.viewLabel}>FRONT</Text>
        </View>
        <View style={styles.figureCol}>
          <BodyFigure view="back" selected={selected} onToggle={onToggle} />
          <Text style={styles.viewLabel}>BACK</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {LEGEND.map(({ area, label }) => (
          <Pressable
            key={area}
            style={[styles.chip, selected.includes(area) && styles.chipSelected]}
            onPress={() => onToggle(area)}
          >
            <View style={[styles.dot, selected.includes(area) && styles.dotSelected]} />
            <Text style={[styles.chipText, selected.includes(area) && styles.chipTextSelected]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {selected.length > 0 && (
        <Text style={styles.hint}>
          {selected.map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(' · ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  figureRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginBottom: 16 },
  figureCol: { alignItems: 'center', gap: 4 },
  viewLabel: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#2a2a3e', borderWidth: 1, borderColor: '#3a3a5e' },
  chipSelected: { backgroundColor: '#3a1a1a', borderColor: '#ff4444' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d8d8d8' },
  dotSelected: { backgroundColor: '#ff4444' },
  chipText: { color: '#aaa', fontSize: 12 },
  chipTextSelected: { color: '#ff4444', fontWeight: '600' },
  hint: { color: '#888', fontSize: 11, textAlign: 'center' },
});
