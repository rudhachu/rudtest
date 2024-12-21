FROM quay.io/princerudh/rudhra:latest
RUN git clone https://github.com/rudhachu/rudtest /root/rudhra/
WORKDIR /root/rudhra/
RUN yarn install --network-concurrency 1
CMD ["node", "index.js"]
