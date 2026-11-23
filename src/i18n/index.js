import i18n from 'i18n-js';

import en from './en.json';
import pt_BR from './pt_BR.json';

i18n.locale = 'en';
i18n.fallbacks = true;
i18n.translations = {
  en,
  pt_BR,
};

export default i18n;
