import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button, EmptyState, IconButton } from '@/components';
import { cacheFood, lookupBarcode, type Meal } from '@/db/queries/nutrition';
import { useTheme } from '@/theme';

/** Scan a barcode: Open Food Facts, then USDA Branded; not found → create the food. */
export default function ScanBarcode() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const [permission, request] = useCameraPermissions();
  const [busy, setBusy] = useState<string | null>(null);
  const handled = useRef(false);

  const onScan = async (code: string) => {
    if (handled.current) return;
    handled.current = true;
    setBusy(code);
    try {
      const hit = await lookupBarcode(code);
      if (!hit) {
        router.replace({ pathname: '/food/new', params: { ...params, barcode: code } });
        return;
      }
      const food = await cacheFood(hit);
      router.replace({ pathname: '/food/[id]', params: { id: food.id, ...params } });
    } catch {
      handled.current = false;
      setBusy(null);
    }
  };

  if (!permission) return <View className="flex-1 bg-bg" />;
  if (!permission.granted)
    return (
      <View className="flex-1 justify-center bg-bg px-6">
        <EmptyState
          icon="camera"
          title="scan a barcode"
          body="Splits needs the camera to read food barcodes. Nothing is recorded or saved."
        >
          <Button size="md" onPress={() => void request()}>
            allow camera
          </Button>
        </EmptyState>
      </View>
    );

  return (
    <View className="flex-1 bg-bg">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={busy ? undefined : ({ data }) => void onScan(data)}
      />
      <View className="absolute top-14 left-4">
        <IconButton icon="x" label="Close" onPress={() => router.back()} />
      </View>
      <View className="absolute right-6 bottom-16 left-6 items-center gap-2 rounded-card bg-surface-card p-4">
        {busy ? (
          <>
            <ActivityIndicator color={c.textMuted} />
            <Text className="type-subhead text-text">Looking up {busy}…</Text>
          </>
        ) : (
          <Text className="type-subhead text-text">Point the camera at the barcode.</Text>
        )}
      </View>
    </View>
  );
}
