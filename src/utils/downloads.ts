import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { tokenStorage } from './tokenStorage';

/**
 * Download an authenticated file to the device cache and open the share sheet
 * (so the user can save / open / forward it). Used for invoice PDF & XML.
 *
 * Uses the legacy expo-file-system API (downloadAsync) which streams the binary
 * straight to a file with the Bearer token attached — no base64 round-trip.
 */
export async function downloadAndShare(
  url: string,
  filename: string,
  mimeType: string
): Promise<void> {
  const safeName = filename.replace(/[^\w.\-]+/g, '_');
  try {
    const token = await tokenStorage.getAccessToken();
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
    const fileUri = `${dir}${safeName}`;

    const result = await FileSystem.downloadAsync(url, fileUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (result.status !== 200) {
      Alert.alert(
        'Download failed',
        result.status === 404
          ? 'This file is not available yet.'
          : `The server returned status ${result.status}.`
      );
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, { mimeType, dialogTitle: safeName });
    } else {
      Alert.alert('Downloaded', `Saved to:\n${result.uri}`);
    }
  } catch {
    Alert.alert('Download failed', 'Could not download the file. Please try again.');
  }
}
