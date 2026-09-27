import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';

// Let third-party components accept `className`.
cssInterop(Image, { className: 'style' });
