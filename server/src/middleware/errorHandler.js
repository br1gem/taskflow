const badDataCodes = ['22P02', '22001', '22007', '22008', '23502', '23514'];

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'Некорректный JSON в теле запроса',
    });
  }

  if (error.code === '23505') {
    return res.status(409).json({
      message: 'Запись с такими данными уже существует',
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({
      message: 'Нарушена связь данных в базе',
    });
  }

  if (badDataCodes.includes(error.code)) {
    return res.status(400).json({
      message: 'База данных отклонила переданные данные',
    });
  }

  console.error(error);

  return res.status(500).json({
    message: 'Внутренняя ошибка сервера',
  });
}