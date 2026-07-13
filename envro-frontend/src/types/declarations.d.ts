declare module 'axios';

declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  import { TextProps, StyleProp, TextStyle } from 'react-native';

  type IconName = string;

  interface IoniconsProps extends TextProps {
    name: IconName;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }

  export const Ionicons: ComponentType<IoniconsProps>;
  export type IoniconsGlyphMap = Record<string, number>;
}



declare module 'expo-document-picker' {
  export function getDocumentAsync(options?: {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }): Promise<{
    canceled: boolean;
    assets?: { uri: string; name: string; mimeType?: string; size?: number }[];
  }>;
}
