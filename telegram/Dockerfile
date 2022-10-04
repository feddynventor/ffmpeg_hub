FROM node 

RUN mkdir /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/
RUN npm install

COPY *.js /opt/app/

CMD ["npm","start"]
