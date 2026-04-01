import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1C2E4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Politique de Confidentialité</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Intro */}
        <View style={styles.section}>
          <Text style={styles.sectionText}>
            Dernière mise à jour : <Text style={{ fontWeight: '700', color: '#1C2E4A' }}>25 mars 2026</Text>
          </Text>
        </View>

        {/* 1. Préambule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Préambule</Text>
          <Text style={styles.sectionText}>
            Ombia Express SAS est une société de droit gabonais, dont le siège social est établi à Libreville, Gabon. En tant qu'opérateur d'une super-application regroupant des services de transport à la demande, de location de véhicules, de livraison et de commerce électronique, Ombia Express s'engage à protéger les données à caractère personnel de ses utilisateurs avec le plus haut niveau de sérieux et de transparence.
          </Text>
          <Text style={[styles.sectionText, { marginTop: 8 }]}>
            La présente Politique de Confidentialité est établie en conformité avec la{' '}
            <Text style={{ fontWeight: '700', color: '#1C2E4A' }}>Loi n°001/2023 du 26 juillet 2023 relative à la protection des données à caractère personnel en République Gabonaise</Text>
            {' '}et s'inspire des standards du Règlement Général sur la Protection des Données (RGPD — UE 2016/679). Elle s'applique à l'ensemble des utilisateurs de l'application mobile Ombia Express, qu'ils soient clients, chauffeurs, livreurs ou propriétaires de véhicules.
          </Text>
        </View>

        {/* 2. Responsable du traitement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Responsable du Traitement</Text>
          <Text style={styles.sectionText}>
            Le responsable du traitement des données à caractère personnel collectées via l'application Ombia Express est :
          </Text>
          <Text style={[styles.sectionText, { marginTop: 8 }]}>
            <Text style={{ fontWeight: '700' }}>Ombia Express SAS</Text>
          </Text>
          <Text style={styles.bullet}>• Siège social : Libreville, République Gabonaise</Text>
          <Text style={styles.bullet}>• Délégué à la Protection des Données (DPO) : dpo@ombiaexpress.com</Text>
          <Text style={styles.bullet}>• Téléphone : +241 XX XX XX XX</Text>
          <Text style={[styles.sectionText, { marginTop: 8 }]}>
            Pour toute question relative au traitement de vos données personnelles, vous pouvez contacter notre DPO à l'adresse électronique indiquée ci-dessus.
          </Text>
        </View>

        {/* 3. Données collectées */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Données Collectées</Text>
          <Text style={styles.sectionText}>
            Dans le cadre de la fourniture de nos services, Ombia Express collecte les catégories de données suivantes :
          </Text>

          <Text style={styles.subTitle}>3.1 Données d'identité</Text>
          <Text style={styles.bullet}>• Nom et prénom</Text>
          <Text style={styles.bullet}>• Adresse email</Text>
          <Text style={styles.bullet}>• Numéro de téléphone</Text>
          <Text style={styles.bullet}>• Photo de profil (optionnelle)</Text>

          <Text style={styles.subTitle}>3.2 Données de localisation</Text>
          <Text style={styles.bullet}>• Position GPS en temps réel lors des courses, livraisons et locations</Text>
          <Text style={styles.bullet}>• Historique des trajets et itinéraires effectués</Text>
          <Text style={styles.bullet}>• Points de départ et d'arrivée des courses</Text>

          <Text style={styles.subTitle}>3.3 Données financières</Text>
          <Text style={styles.bullet}>• Informations de paiement : Airtel Money, Moov Money, carte bancaire</Text>
          <Text style={styles.bullet}>• Solde et transactions du portefeuille numérique Ombia</Text>
          <Text style={styles.bullet}>• Historique des paiements et factures</Text>

          <Text style={styles.subTitle}>3.4 Données de navigation</Text>
          <Text style={styles.bullet}>• Journaux d'utilisation de l'application (logs)</Text>
          <Text style={styles.bullet}>• Type d'appareil et système d'exploitation</Text>
          <Text style={styles.bullet}>• Identifiant publicitaire anonymisé de l'appareil</Text>
          <Text style={styles.bullet}>• Données de performance et de crash de l'application</Text>

          <Text style={styles.subTitle}>3.5 Données KYC (chauffeurs, livreurs et propriétaires)</Text>
          <Text style={styles.bullet}>• Pièce d'identité nationale ou passeport</Text>
          <Text style={styles.bullet}>• Permis de conduire en cours de validité</Text>
          <Text style={styles.bullet}>• Documents relatifs au véhicule (carte grise, assurance, visite technique)</Text>
          <Text style={styles.bullet}>• Relevé d'identité bancaire (RIB) ou informations Mobile Money</Text>
        </View>

        {/* 4. Finalités et bases légales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Finalités et Bases Légales</Text>
          <Text style={styles.sectionText}>
            Chaque traitement de données repose sur une base légale explicite, conformément à l'Art. 9 de la Loi n°001/2023 et à l'Art. 6 du RGPD :
          </Text>

          <Text style={styles.subTitle}>Exécution du contrat (Art. 6.1.b RGPD / Art. 9 Loi 001/2023)</Text>
          <Text style={styles.bullet}>• Fourniture des services de transport à la demande</Text>
          <Text style={styles.bullet}>• Gestion des locations de véhicules</Text>
          <Text style={styles.bullet}>• Traitement des commandes de livraison et d'e-commerce</Text>
          <Text style={styles.bullet}>• Gestion du compte utilisateur et des transactions</Text>

          <Text style={styles.subTitle}>Intérêt légitime</Text>
          <Text style={styles.bullet}>• Amélioration continue des services et de l'expérience utilisateur</Text>
          <Text style={styles.bullet}>• Sécurité de la plateforme et prévention des abus</Text>
          <Text style={styles.bullet}>• Détection et prévention des fraudes</Text>
          <Text style={styles.bullet}>• Analyses statistiques et optimisation des opérations</Text>

          <Text style={styles.subTitle}>Obligation légale</Text>
          <Text style={styles.bullet}>• Conformité aux exigences COBAC/BEAC relatives aux paiements électroniques</Text>
          <Text style={styles.bullet}>• Respect des obligations fiscales et comptables gabonaises</Text>
          <Text style={styles.bullet}>• Réponse aux réquisitions judiciaires et administratives</Text>

          <Text style={styles.subTitle}>Consentement (révocable à tout moment)</Text>
          <Text style={styles.bullet}>• Envoi de communications marketing et offres promotionnelles</Text>
          <Text style={styles.bullet}>• Notifications push personnalisées</Text>
          <Text style={styles.bullet}>• Participation à des programmes de fidélité</Text>
        </View>

        {/* 5. Conservation des données */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Conservation des Données</Text>
          <Text style={styles.sectionText}>
            Ombia Express applique des durées de conservation strictement proportionnées aux finalités du traitement :
          </Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Compte actif :</Text> pendant toute la durée de la relation contractuelle</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Après fermeture du compte :</Text> 5 ans (obligations comptables gabonaises — Code Général des Impôts)</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Données de géolocalisation des courses :</Text> 13 mois glissants</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Données KYC :</Text> 5 ans après la fin de la relation contractuelle</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Logs techniques :</Text> 12 mois</Text>
          <Text style={[styles.sectionText, { marginTop: 8 }]}>
            À l'expiration de ces délais, les données sont supprimées de manière sécurisée ou anonymisées de façon irréversible.
          </Text>
        </View>

        {/* 6. Partage des données */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Partage des Données</Text>
          <Text style={styles.sectionText}>
            Ombia Express ne vend jamais vos données à caractère personnel à des tiers à des fins commerciales. Les données peuvent être partagées uniquement dans les cas suivants :
          </Text>

          <Text style={styles.subTitle}>Partenaires de service</Text>
          <Text style={styles.sectionText}>
            Les chauffeurs, livreurs et propriétaires de véhicules reçoivent uniquement les données strictement nécessaires à l'exécution du service commandé (nom, numéro de téléphone, point de prise en charge/livraison).
          </Text>

          <Text style={styles.subTitle}>Prestataires de paiement</Text>
          <Text style={styles.bullet}>• Airtel Money Gabon</Text>
          <Text style={styles.bullet}>• Moov Money Gabon</Text>
          <Text style={styles.bullet}>• Établissements bancaires agréés par la COBAC</Text>

          <Text style={styles.subTitle}>Autorités compétentes</Text>
          <Text style={styles.sectionText}>
            Sur présentation d'une réquisition judiciaire émanant des tribunaux gabonais compétents ou sur injonction administrative de l'Autorité de Protection des Données Personnelles (APDP) du Gabon, conformément à la Loi n°001/2023.
          </Text>

          <Text style={styles.subTitle}>Sous-traitants techniques</Text>
          <Text style={styles.sectionText}>
            Prestataires d'hébergement et services cloud liés par des accords de traitement garantissant un niveau de protection équivalent à celui exigé par la législation gabonaise et le RGPD.
          </Text>
        </View>

        {/* 7. Vos droits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Vos Droits</Text>
          <Text style={styles.sectionText}>
            Conformément à la Loi n°001/2023 relative à la protection des données à caractère personnel au Gabon, vous disposez des droits suivants sur vos données :
          </Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Droit d'accès :</Text> obtenir confirmation du traitement et une copie de vos données</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Droit de rectification :</Text> corriger des données inexactes ou incomplètes</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Droit à l'effacement :</Text> demander la suppression de vos données (sous conditions légales)</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Droit à la portabilité :</Text> recevoir vos données dans un format structuré et lisible</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Droit d'opposition :</Text> vous opposer à certains traitements, notamment à des fins de prospection</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Droit de limitation :</Text> restreindre temporairement le traitement de vos données</Text>
          <Text style={styles.bullet}>• <Text style={{ fontWeight: '700' }}>Droit de retrait du consentement :</Text> révoquer à tout moment votre consentement pour les traitements basés sur celui-ci</Text>

          <Text style={styles.subTitle}>Comment exercer vos droits</Text>
          <Text style={styles.sectionText}>
            Adressez votre demande écrite à notre DPO à l'adresse{' '}
            <Text style={{ fontWeight: '700', color: '#FFA726' }}>dpo@ombiaexpress.com</Text>
            , accompagnée d'une copie de votre pièce d'identité. Nous nous engageons à vous répondre dans un délai de <Text style={{ fontWeight: '700' }}>30 jours calendaires</Text> à compter de la réception de votre demande.
          </Text>

          <Text style={styles.subTitle}>Droit de réclamation</Text>
          <Text style={styles.sectionText}>
            Si vous estimez que le traitement de vos données n'est pas conforme à la réglementation en vigueur, vous avez le droit d'introduire une réclamation auprès de l'<Text style={{ fontWeight: '700' }}>Autorité de Protection des Données Personnelles (APDP) de la République Gabonaise</Text>.
          </Text>
        </View>

        {/* 8. Sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Sécurité des Données</Text>
          <Text style={styles.sectionText}>
            Ombia Express met en œuvre des mesures techniques et organisationnelles appropriées pour garantir la sécurité, l'intégrité et la confidentialité de vos données personnelles :
          </Text>
          <Text style={styles.bullet}>• Chiffrement des communications par protocole TLS/SSL</Text>
          <Text style={styles.bullet}>• Stockage sécurisé des données avec chiffrement au repos</Text>
          <Text style={styles.bullet}>• Accès aux données strictement restreint au personnel autorisé et habilité</Text>
          <Text style={styles.bullet}>• Audits de sécurité réguliers et tests d'intrusion périodiques</Text>
          <Text style={styles.bullet}>• Conformité aux normes PCI-DSS pour le traitement des données de paiement</Text>
          <Text style={styles.bullet}>• Procédures de réponse aux incidents et de notification en cas de violation de données</Text>
          <Text style={[styles.sectionText, { marginTop: 8 }]}>
            En cas de violation de données susceptible d'engendrer un risque élevé pour vos droits et libertés, Ombia Express vous en informera dans les meilleurs délais, conformément aux obligations légales applicables.
          </Text>
        </View>

        {/* 9. Transferts internationaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Transferts Internationaux de Données</Text>
          <Text style={styles.sectionText}>
            Dans le cadre de nos opérations, certaines données peuvent être hébergées ou traitées en dehors du territoire gabonais. Ombia Express s'assure que ces transferts s'effectuent dans des conditions de sécurité optimales :
          </Text>
          <Text style={styles.bullet}>• Hébergement prioritaire en Europe sur des serveurs conformes au RGPD</Text>
          <Text style={styles.bullet}>• Hébergement alternatif en Afrique Centrale selon disponibilité des infrastructures</Text>
          <Text style={styles.bullet}>• Application de clauses contractuelles types (garanties contractuelles standard) avec tous les sous-traitants établis hors du Gabon</Text>
          <Text style={styles.bullet}>• Vérification préalable du niveau de protection adéquat dans les pays de destination</Text>
        </View>

        {/* 10. Cookies et technologies similaires */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Cookies et Technologies Similaires</Text>
          <Text style={styles.sectionText}>
            L'application mobile Ombia Express utilise des technologies similaires aux cookies dans les limites suivantes :
          </Text>
          <Text style={styles.bullet}>• Identifiants anonymes d'appareils à des fins d'analyse d'usage et d'amélioration des performances</Text>
          <Text style={styles.bullet}>• Tokens d'authentification sécurisés pour le maintien de votre session</Text>
          <Text style={styles.bullet}>• Données de préférences utilisateur stockées localement sur votre appareil</Text>
          <Text style={[styles.sectionText, { marginTop: 8 }]}>
            Ombia Express n'intègre <Text style={{ fontWeight: '700' }}>aucun cookie publicitaire tiers</Text> et ne permet pas à des régies publicitaires externes de tracer votre comportement au sein de l'application.
          </Text>
        </View>

        {/* 11. Modifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Modifications de la Politique</Text>
          <Text style={styles.sectionText}>
            Ombia Express se réserve le droit de modifier la présente Politique de Confidentialité afin de refléter l'évolution de nos pratiques, des services proposés ou des exigences légales et réglementaires applicables.
          </Text>
          <Text style={[styles.sectionText, { marginTop: 8 }]}>
            En cas de modification substantielle affectant vos droits ou la manière dont nous traitons vos données, vous serez notifié par :
          </Text>
          <Text style={styles.bullet}>• Email à l'adresse associée à votre compte Ombia Express</Text>
          <Text style={styles.bullet}>• Notification push sur l'application mobile</Text>
          <Text style={styles.bullet}>• Message visible lors de votre prochaine connexion</Text>
          <Text style={[styles.sectionText, { marginTop: 8 }]}>
            La poursuite de l'utilisation des services après notification vaut acceptation de la politique révisée. La date de dernière mise à jour est indiquée en en-tête du présent document.{' '}
            <Text style={{ fontWeight: '700' }}>Dernière mise à jour : 25 mars 2026.</Text>
          </Text>
        </View>

        {/* 12. Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Nous Contacter</Text>
          <Text style={styles.sectionText}>
            Pour toute question, demande ou réclamation relative au traitement de vos données personnelles, veuillez contacter :
          </Text>
          <Text style={[styles.sectionText, { marginTop: 8, fontWeight: '700', color: '#1C2E4A' }]}>Ombia Express — Délégué à la Protection des Données</Text>
          <Text style={styles.bullet}>• Email : dpo@ombiaexpress.com</Text>
          <Text style={styles.bullet}>• Téléphone : +241 XX XX XX XX</Text>
          <Text style={styles.bullet}>• Adresse postale : BP Libreville, République Gabonaise</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Ombia Express SAS — Société de droit gabonais{'\n'}
            Politique établie en conformité avec la Loi n°001/2023 du 26 juillet 2023{'\n'}
            relative à la protection des données à caractère personnel au Gabon{'\n'}
            et les standards du RGPD (UE 2016/679)
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: '#1C2E4A',
    marginRight: 38,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C2E4A',
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA726',
  },
  sectionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 21,
  },
  bullet: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 21,
    paddingLeft: 12,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C2E4A',
    marginTop: 8,
    marginBottom: 4,
  },
  footer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF8EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  footerText: {
    fontSize: 11,
    color: '#7C5A1E',
    lineHeight: 18,
    textAlign: 'center',
  },
});
