/**
 * Точка запуска приложения на node.js для SSR.
 * Входные параметры передаются через workerData от главного процесса.
 * Результат рендера возвращается через parentPort главному процессу.
 * Приложение запускается отдельно в потоке на каждый запрос для локализации состояния рендера
 */
import React from 'react';
import path from 'path';
import { parentPort, workerData } from 'worker_threads';
import { ChunkExtractor, ChunkExtractorManager } from '@loadable/server';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import services from '@src/services';
import config from 'config.js';
import App from '@src/app';
import template from './index.html';
import insertText from '@src/utils/insert-text';

(async () => {
  // Инициализация менеджера сервисов
  // Через него получаем сервисы ssr, api, navigation, states и другие
  // При первом обращении к ним, они будут автоматически инициализированы с учётом конфигурации
  await services.init(config);

  // Корректировка общей конфигурации параметрами от сервера
  services.configure({
    navigation: {
      // Точку входа для навигации (какую страницу рендерить)
      initialEntries: [workerData.url],
    },
    ssr: {
      // Все параметры рендера от воркера
      ...workerData,
    },
  });

  // JSX как у клиента
  const jsx = (
    <Provider store={services.states.store}>
      <Router history={services.navigation.history}>
        <App />
      </Router>
    </Provider>
  );

  // Обертка от loadable-components для корректной подгрузки чанков с динамическим импортом
  const statsFile = path.resolve('./dist/node/loadable-stats.json');
  const extractor = new ChunkExtractor({ statsFile });
  const jsxExtractor = extractor.collectChunks(
    <ChunkExtractorManager extractor={extractor}>{jsx}</ChunkExtractorManager>,
  );

  // Рендер в строку с ожиданием асинхронных действий приложения
  const html = await services.ssr.render(jsxExtractor);

  // Ключи исполненных initState
  const keys = services.ssr.getPrepareKeys();

  // Состояние
  const state = services.states.getState();

  // В HTML добавляем ключ состояние, которое клиент выберет сам
  const scriptState = `<script>window.stateKey="${services.ssr.getStateKey()}"</script>`;

  // Метаданные рендера
  const helmetData = Helmet.renderStatic();
  const baseTag = `<base href="${config.navigation.basename}">`;
  const titleTag = helmetData.title.toString();
  const metaTag = helmetData.meta.toString();
  const linkTags = helmetData.link.toString();

  // Скрипты, ссылки, стили с учётом параметров сборки
  const scriptTags = extractor.getScriptTags();
  const linkTags2 = extractor.getLinkTags();
  const styleTags = extractor.getStyleTags();

  let out = template;
  out = insertText.before(out, '<head>', baseTag + titleTag + metaTag);
  out = insertText.after(out, '</head>', styleTags + linkTags + linkTags2);
  out = insertText.before(out, '<div id="app">', html);
  out = insertText.after(out, '</body>', scriptState + scriptTags);

  parentPort.postMessage({ out, state, keys, status: 200, html });
})();

process.on('unhandledRejection', function (reason /*, p*/) {
  parentPort.postMessage({ out: `ERROR: ${reason.toString()}`, status: 500 });
  console.error(reason);
  process.exit(1);
});
