/************************************************************
 * ESP-1 — HARMONY AURA OS (ANIMATED UI + 5s PAGES)
 ************************************************************/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <SPI.h>
#include <Wire.h>
#include <DHT.h>

/**************** WIFI ****************/
const char* ssid = "Luminara";
const char* password = "3012priya";

/**************** ESP-2 ****************/
const char* esp2DataUrl = "http://10.30.100.84:8000/esp1/data";
const char* esp2CmdUrl  = "http://10.30.100.84:8000/esp1/cmd";

/**************** OLED ****************/
#define OLED_CLK  18
#define OLED_MOSI 23
#define OLED_CS   5
#define OLED_DC   16
#define OLED_RES  17

U8G2_SH1106_128X64_NONAME_F_4W_HW_SPI u8g2(
  U8G2_R0, OLED_CS, OLED_DC, OLED_RES
);

/**************** SENSORS ****************/
#define PULSE_PIN 34
#define DHT_PIN   4
#define DHT_TYPE  DHT11
#define MPU_ADDR  0x68

DHT dht(DHT_PIN, DHT_TYPE);

/**************** DATA ****************/
float heartRate=0, beatAvg=0, motion=0, tempC=0;
int hrv=0, jerkCount=0;

/**************** FILTER ****************/
float motionFiltered=0;

/**************** HEART ****************/
unsigned long lastBeatTime=0;
int pulseThreshold=550;

/**************** UI ****************/
uint8_t page=0;
unsigned long pageStartTime=0;
const unsigned long PAGE_DURATION = 5000;

/**************** CIS ****************/
int cis=100;
String command="NORMAL";
bool commandActive=false;
unsigned long commandStart=0;
const unsigned long COMMAND_HOLD=6000;

/**************** NETWORK ****************/
unsigned long lastSend=0;

/**************** DRAW BAR ****************/
void drawBar(int x,int y,int w,int h,int v,int maxV){
  int f=map(constrain(v,0,maxV),0,maxV,0,w);
  u8g2.drawFrame(x,y,w,h);
  if(f>2)u8g2.drawBox(x+1,y+1,f-2,h-2);
}

/**************** BOOT ****************/
void bootScreen(){
  for(int i=0;i<=100;i+=4){
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_6x12_tf);
    u8g2.drawStr(22,20,"Harmony Aura OS");
    u8g2.drawStr(42,34,"Loading...");
    drawBar(16,48,96,8,i,100);
    u8g2.sendBuffer();
    delay(35);
  }
}

/**************** SETUP ****************/
void setup(){
  Serial.begin(115200);

  WiFi.begin(ssid,password);
  while(WiFi.status()!=WL_CONNECTED){delay(500);}

  SPI.begin(OLED_CLK,-1,OLED_MOSI,OLED_CS);
  u8g2.begin();
  u8g2.setContrast(255);
  bootScreen();

  pinMode(PULSE_PIN,INPUT);
  dht.begin();

  Wire.begin(21,22);
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission();

  pageStartTime = millis();
}

/**************** LOOP ****************/
void loop(){
  readSensors();

  if(millis()-lastSend>2000){
    sendHumanData();
    receiveCommand();
    jerkCount=0;
    lastSend=millis();
  }

  drawUI();
  delay(40);   // smooth animations
}

/**************** SENSOR READ ****************/
void readSensors(){

  int p=analogRead(PULSE_PIN);
  if(p>pulseThreshold && millis()-lastBeatTime>350){
    unsigned long now=millis();
    float bpm=60000.0/(now-lastBeatTime);
    lastBeatTime=now;
    if(bpm>40 && bpm<160){
      heartRate=bpm;
      beatAvg=beatAvg*0.9+bpm*0.1;
      hrv=abs((int)(60000/bpm)-(60000/beatAvg));
    }
  }

  float t=dht.readTemperature();
  if(!isnan(t))tempC=t;

  int16_t ax,ay,az;
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU_ADDR,(uint8_t)6,true);

  ax=Wire.read()<<8|Wire.read();
  ay=Wire.read()<<8|Wire.read();
  az=Wire.read()<<8|Wire.read();

  float mag=sqrt(ax*ax+ay*ay+az*az)/16384.0;
  float dyn=fabs(mag-1.0);
  motionFiltered=motionFiltered*0.8+dyn*0.2;
  motion=motionFiltered;

  if(motion>0.6)jerkCount++;
}

/**************** UI ****************/
void drawUI(){

  bool blink=(millis()/500)%2;
  int pulseAnim=abs(sin(millis()/300.0))*6;

  // COMMAND OVERRIDE
  if(commandActive && millis()-commandStart<COMMAND_HOLD){
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.setCursor(22,34);
    u8g2.print(command);
    if(blink)u8g2.drawFrame(0,0,128,64);
    u8g2.sendBuffer();
    return;
  }

  // PAGE TIMER (5s)
  if(millis() - pageStartTime >= PAGE_DURATION){
    page = (page + 1) % 5;
    pageStartTime = millis();
  }

  u8g2.clearBuffer();

  // HEART
  if(page==0){
    u8g2.setFont(u8g2_font_6x12_tf);
    u8g2.drawStr(2,10,"HEART RATE");
    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.setCursor(2,30);
    u8g2.print((int)beatAvg);
    u8g2.drawStr(36,30,"bpm");

    u8g2.drawDisc(98,22,4+pulseAnim/3);
    u8g2.drawDisc(108,22,4+pulseAnim/3);
    u8g2.drawTriangle(94,22,112,22,103,36+pulseAnim/2);

    drawBar(2,50,124,8,beatAvg,160);
  }

  // TEMP
  else if(page==1){
    u8g2.drawStr(2,10,"TEMPERATURE");
    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.setCursor(2,30);
    u8g2.print(tempC,1);
    int r=3+abs(sin(millis()/500.0))*4;
    u8g2.drawCircle(102,28,r);
    drawBar(2,50,124,8,tempC*2,100);
  }

  // MOTION
  else if(page==2){
    u8g2.drawStr(2,10,"MOTION & JERK");
    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.setCursor(2,30);
    u8g2.print(motion,2);
    u8g2.setCursor(78,30);
    u8g2.print("J:");
    u8g2.print(jerkCount);

    for(int i=0;i<124;i+=5){
      int y=42+sin((i+millis()/4)*0.12)*4;
      u8g2.drawPixel(i+2,y);
    }
    drawBar(2,50,124,8,motion*20,20);
  }

  // CIS
  else if(page==3){
    u8g2.drawStr(2,10,"CIS SCORE");
    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.setCursor(48,30);
    u8g2.print(cis);
    drawBar(2,50,124,8,cis,100);
  }

  // STATUS
  else{
    bool risk=cis<50;
    if(risk && blink)u8g2.drawFrame(0,0,128,64);
    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.setCursor(36,32);
    u8g2.print(risk?"RISK":"SAFE");
  }

  u8g2.sendBuffer();
}

/**************** NETWORK ****************/
void sendHumanData() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(esp2DataUrl);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<768> doc;
  JsonObject human = doc.createNestedObject("human");

  JsonObject cardio = human.createNestedObject("cardiovascular");
  cardio["heart_rate_bpm"] = (int)beatAvg;
  cardio["heart_rate_variability_ms"] = hrv;
  cardio["hr_recovery_rate"] = 0.12;

  JsonObject motionObj = human.createNestedObject("motion_posture");
  motionObj["motion_magnitude"] = motion;
  motionObj["motion_cadence"] = motion * 3.0;
  motionObj["sudden_jerks_count"] = jerkCount;
  motionObj["over_corrections_count"] = jerkCount / 2;
  motionObj["reaction_latency_ms"] = 400 + jerkCount * 10;

  JsonObject phys = human.createNestedObject("physiological_stress");
  phys["skin_temperature_c"] = tempC;
  phys["temperature_drift_rate"] = 0.02;

  JsonObject beh = human.createNestedObject("behavioral");
  beh["continuous_work_minutes"] = millis() / 60000.0;
  beh["break_gap_minutes"] = 42;
  beh["shift_hours_accumulated"] = millis() / 3600000.0;

  String payload;
  serializeJson(doc, payload);

  // 🔴 THIS LINE IS CRITICAL
  http.addHeader("Content-Length", String(payload.length()));

  Serial.println("\n[ESP-1 → ESP-2 HUMAN JSON]");
  Serial.println(payload);

  int code = http.POST(payload);
  Serial.printf("[HTTP POST] %d\n", code);

  http.end();
}



void receiveCommand(){
  if(WiFi.status()!=WL_CONNECTED)return;
  HTTPClient http;
  http.begin(esp2CmdUrl);
  if(http.GET()==200){
    StaticJsonDocument<128> doc;
    deserializeJson(doc,http.getString());
    cis=doc["cis"];
    String c=doc["command"];
    if(c!="NORMAL"){
      command=c;
      commandActive=true;
      commandStart=millis();
    }
  }
  http.end();
}
