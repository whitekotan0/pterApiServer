FROM nginx:alpine

# Копіюємо статичні файли
COPY . /usr/share/nginx/html

# Копіюємо nginx конфіг
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

