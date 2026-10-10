import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors, typography } from '@/lib/theme';
export default function LegalScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <Button title="← Volver" variant="ghost" onPress={() => router.back()} />
        <Text style={typography.h1}>Privacidad y condiciones</Text>
        <Text style={typography.body}>
          Racha almacena los datos de tu cuenta y los registros que elegís guardar. Podés controlar
          qué compartís con tu compañero desde Privacidad y eliminar tu cuenta desde Cuenta.
        </Text>
        <Text style={typography.body}>
          Al usar el análisis por foto o texto, ese contenido se envía al proveedor de análisis para
          identificar alimentos. Las cantidades y valores nutricionales son estimaciones que podés
          corregir. Racha no realiza diagnósticos ni reemplaza atención profesional.
        </Text>
        <Text style={typography.body}>
          Las compras se procesan por Apple o Google y RevenueCat administra el acceso. El precio,
          duración y cualquier prueba se muestran antes de confirmar en la tienda. La renovación es
          automática; cancelá desde la tienda antes de la siguiente renovación. Restaurar compras
          permite recuperar el acceso correspondiente a tu cuenta.
        </Text>
        <Text style={typography.body}>
          Gratis incluye tres análisis de prueba por cuenta. Plus y Dúo incluyen 90 análisis por
          persona por mes calendario UTC. Un intento aceptado para procesar consume un análisis,
          aunque no detecte comida. Los registros manuales y el acceso a tus datos siguen
          disponibles sin suscripción.
        </Text>
        <Button title="Configurar privacidad" onPress={() => router.push('/settings/privacy')} />
        <Button
          title="Cuenta y eliminación"
          variant="secondary"
          onPress={() => router.push('/settings/account')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
